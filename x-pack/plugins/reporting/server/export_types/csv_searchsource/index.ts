/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient } from '@kbn/core-elasticsearch-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import { IBasePath, HttpServiceSetup, KibanaRequest, FakeRawRequest } from '@kbn/core-http-server';
import { CoreSetup } from '@kbn/core-lifecycle-server';
import { PluginInitializerContext, Headers, Logger } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import { CONTENT_TYPE_CSV } from '@kbn/generate-csv/src/constants';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { CancellationToken } from '@kbn/reporting-common';
import { Writable } from 'stream';
import { CSV_JOB_TYPE } from '../../../common/constants';
import {
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
} from '../../../common/constants';
import { ReportingConfigType } from '../../config';
import { getFieldFormats } from '../../services';
import { ExportType, decryptJobHeaders } from '../common';
import { JobParamsCSV, TaskPayloadCSV } from './types';

/*
 * @TODO move to be within @kbn/reporitng-export-types
 */
export interface CsvSearchsourceExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
  logger: Logger;
}

export interface CsvSearchsourceExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  logger: Logger;
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
  esClient: IClusterClient;
}

export class CsvSearchsourceExportType
  implements
    ExportType<
      CsvSearchsourceExportTypeSetupDeps,
      CsvSearchsourceExportTypeStartDeps,
      JobParamsCSV,
      TaskPayloadCSV
    >
{
  private http: HttpServiceSetup;
  id = 'csv_searchsource';
  name = CSV_JOB_TYPE;

  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];
  jobType = CONTENT_TYPE_CSV;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'png' as const;
  setupDeps!: CsvSearchsourceExportTypeSetupDeps;
  startDeps!: CsvSearchsourceExportTypeStartDeps;

  constructor(
    core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = this.logger.get('csv-export');
    this.http = core.http;
  }

  setup(setupDeps: CsvSearchsourceExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }

  start(startDeps: CsvSearchsourceExportTypeStartDeps) {
    this.startDeps = startDeps;
  }

  public async getEsClient() {
    const startDeps = await this.startDeps;
    return startDeps.esClient;
  }

  public async getDataService() {
    const startDeps = await this.startDeps;
    return startDeps.data;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.setupDeps!.spaces?.spacesService;
    if (spacesService) {
      const spaceId = spacesService?.getSpaceId(request);

      if (spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Request uses Space ID: ${spaceId}`);
        return spaceId;
      } else {
        logger.debug(`Request uses default Space`);
      }
    }
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = this.startDeps;
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = this.startDeps;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.setupDeps.spaces?.spacesService;
    const spaceId = await this.getSpaceId(request, logger);

    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return await this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  public getFakeRequest(
    headers: Headers,
    spaceId: string | undefined,
    logger = this.logger
  ): KibanaRequest {
    const rawRequest: FakeRawRequest = {
      headers,
      path: '/',
    };
    const fakeRequest = CoreKibanaRequest.from(rawRequest);

    const spacesService = this.setupDeps.spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }
    return fakeRequest;
  }

  /**
   * @param jobParamsCSV
   * @returns jobParams
   */
  public createJob(jobParams: JobParamsCSV) {
    return { ...jobParams, isDeprecated: false };
  }

  public async runTask(
    job: TaskPayloadCSV,
    jobId: string,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
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
  }
}
