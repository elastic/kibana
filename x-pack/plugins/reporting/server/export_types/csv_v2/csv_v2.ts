/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KibanaRequest } from '@kbn/core/server';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { CsvGenerator } from '@kbn/generate-csv';
import { Writable } from 'stream';
import { CancellationToken } from '@kbn/reporting-common';
import { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from '../../../common/types';
import {
  CSV_REPORT_TYPE_V2,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { ExportType, BaseExportTypeSetupDeps, BaseExportTypeStartDeps } from '../common';
import { ReportingRequestHandlerContext } from '../../types';
import { getFieldFormats } from '../../services';
import { decryptJobHeaders } from '../common/decrypt_job_headers';

type CsvV2ExportTypeSetupDeps = BaseExportTypeSetupDeps;
export interface CsvV2ExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

export class CsvV2ExportType extends ExportType<
  JobParamsCsvFromSavedObject,
  TaskPayloadCsvFromSavedObject,
  CsvV2ExportTypeSetupDeps,
  CsvV2ExportTypeStartDeps
> {
  id = CSV_REPORT_TYPE_V2;
  name = CSV_REPORT_TYPE_V2;
  jobType = CSV_REPORT_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    const logger = args[2];
    this.logger = logger.get('csv-export-v2');
  }

  public createJob = async (
    jobParams: JobParamsCsvFromSavedObject,
    _context: ReportingRequestHandlerContext,
    req: KibanaRequest
  ) => {
    // 1. Validation of locatorParams
    const { locatorParams } = jobParams;
    const { id, params } = locatorParams[0];
    if (
      !locatorParams ||
      !Array.isArray(locatorParams) ||
      locatorParams.length !== 1 ||
      id !== 'DISCOVER_APP_LOCATOR' ||
      !params
    ) {
      throw Boom.badRequest('Invalid Job params: must contain a single Discover App locator');
    }

    if (!params || !params.savedSearchId || typeof params.savedSearchId !== 'string') {
      throw Boom.badRequest('Invalid Discover App locator: must contain a savedSearchId');
    }

    // use Discover contract to get the title of the report from job params
    const { discover: discoverPluginStart } = this.startDeps;
    const locatorClient = await discoverPluginStart.locator.asScopedClient(req);
    const title = await locatorClient.titleFromLocator(params);

    return { ...jobParams, title, objectType: 'search', isDeprecated: false };
  };

  public runTask = async (
    jobId: string,
    job: TaskPayloadCsvFromSavedObject,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const config = this.config;
    const { encryptionKey, csv: csvConfig } = config;
    const logger = this.logger.get(`execute:${jobId}`);

    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
    const { data: dataPluginStart, discover: discoverPluginStart } = this.startDeps;
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(fakeRequest);
    const columns = await locatorClient.columnsFromLocator(params);
    const searchSource = await locatorClient.searchSourceFromLocator(params);

    const es = this.startDeps.esClient.asScoped(fakeRequest);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(fakeRequest);

    const clients = { uiSettings, data, es };
    const dependencies = { searchSourceStart, fieldFormatsRegistry };

    const csv = new CsvGenerator(
      {
        columns,
        searchSource: searchSource.getSerializedFields(true),
        ...job,
      },
      csvConfig,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
}
