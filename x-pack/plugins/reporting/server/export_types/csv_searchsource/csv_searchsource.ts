/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient } from '@kbn/core-elasticsearch-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import { CONTENT_TYPE_CSV } from '@kbn/generate-csv/src/constants';
import { CancellationToken } from '@kbn/reporting-common';
import { Writable } from 'stream';
import {
  CSV_JOB_TYPE,
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

/*
 * @TODO move to be within @kbn/reporitng-export-types
 */

type CsvSearchsourceExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchsourceExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
  esClient: IClusterClient;
}

export class CsvSearchsourceExportType extends ExportType<
  JobParamsCSV,
  TaskPayloadCSV,
  CsvSearchsourceExportTypeSetupDeps,
  CsvSearchsourceExportTypeStartDeps
> {
  id = 'csv_searchsource';
  name = CSV_JOB_TYPE;
  jobType = CONTENT_TYPE_CSV;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  declare startDeps: CsvSearchsourceExportTypeStartDeps;

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    const logger = args[2];
    this.logger = logger.get('csv-searchsource-export');
  }

  setup(setupDeps: ExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }

  start(startDeps: CsvSearchsourceExportTypeStartDeps) {
    this.startDeps = startDeps;
  }

  /**
   * @param jobParamsCSV
   * @returns jobParams
   */
  public createJob = (jobParams: JobParamsCSV) => {
    return { ...jobParams, isDeprecated: false };
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
    const dataPluginStart = await this.getDataService();
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const [es, searchSourceStart] = await Promise.all([
      (await this.getEsClient()).asScoped(fakeRequest),
      await dataPluginStart.search.searchSource.asScoped(fakeRequest),
    ]);

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
