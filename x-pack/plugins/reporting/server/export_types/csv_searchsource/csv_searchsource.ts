/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import { CancellationToken } from '@kbn/reporting-common';
import { Writable } from 'stream';
import {
  CSV_JOB_TYPE,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { getFieldFormats } from '../../services';
import { ExportType, BaseExportTypeSetupDeps, BaseExportTypeStartDeps } from '../common';
import { decryptJobHeaders } from '../common/decrypt_job_headers';
import { JobParamsCSV, TaskPayloadCSV } from './types';

type CsvSearchSourceExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

export class CsvSearchSourceExportType extends ExportType<
  JobParamsCSV,
  TaskPayloadCSV,
  CsvSearchSourceExportTypeSetupDeps,
  CsvSearchSourceExportTypeStartDeps
> {
  id = 'csv_searchsource';
  name = CSV_JOB_TYPE;
  jobType = CSV_JOB_TYPE;
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
    this.logger = this.logger.get('csv-searchsource-export');
  }

  public createJob = async (jobParams: JobParamsCSV) => {
    return { ...jobParams };
  };

  public runTask = async (
    jobId: string,
    job: TaskPayloadCSV,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const { encryptionKey, csv: csvConfig } = this.config;
    const logger = this.logger.get(`execute-job:${jobId}`);
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
    const dataPluginStart = this.startDeps.data;
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const es = this.startDeps.esClient.asScoped(fakeRequest);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(fakeRequest);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(fakeRequest),
      es,
    };
    const dependencies = {
      searchSourceStart,
      fieldFormatsRegistry,
    };

    const csv = new CsvGenerator(
      job,
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
