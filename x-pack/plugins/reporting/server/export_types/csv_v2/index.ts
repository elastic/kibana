/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  KibanaRequest,
  Logger,
  IBasePath,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  PluginInitializerContext,
  CoreSetup,
  HttpServiceSetup,
  CoreKibanaRequest,
  FakeRawRequest,
  Headers,
  SavedObjectsClientContract,
  IClusterClient,
} from '@kbn/core/server';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { CsvGenerator } from '@kbn/generate-csv';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { Writable } from 'stream';
import { CancellationToken } from '@kbn/reporting-common';
import { CONTENT_TYPE_CSV } from '@kbn/generate-csv/src/constants';
import { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from '../../../common/types';
import {
  CSV_REPORT_TYPE_V2,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { ReportingConfigType } from '../../config';
import { decryptJobHeaders, ExportType } from '../common';
import { ReportingRequestHandlerContext } from '../../types';
import { getFieldFormats } from '../../services';

/*
 * @TODO move to be within @kbn/reporitng-export-types
 */
export interface CsvExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
  logger: Logger;
}

export interface CsvExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  logger: Logger;
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
  esClient: IClusterClient;
}

export class CsvExportType
  implements
    ExportType<
      CsvExportTypeSetupDeps,
      CsvExportTypeStartDeps,
      JobParamsCsvFromSavedObject,
      TaskPayloadCsvFromSavedObject
    >
{
  private http: HttpServiceSetup;

  id = CSV_REPORT_TYPE_V2;
  name = 'CSV'; // CSV_V2?
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
  setupDeps!: CsvExportTypeSetupDeps;
  startDeps!: CsvExportTypeStartDeps;

  constructor(
    core: CoreSetup,
    private config: ReportingConfigType,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.logger = logger.get('pdf-export');
    this.http = core.http;
  }

  setup(setupDeps: CsvExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
  }

  start(startDeps: CsvExportTypeStartDeps) {
    this.startDeps = startDeps;
  }

  public async getEsClient() {
    const startDeps = await this.startDeps;
    return startDeps.esClient;
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

  public async createJob(
    jobParams: JobParamsCsvFromSavedObject,
    _context: ReportingRequestHandlerContext,
    req: KibanaRequest
  ) {
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

    return { ...jobParams, title };
  }

  public async runTask(
    job: TaskPayloadCsvFromSavedObject,
    jobId: string,
    cancellationToken: CancellationToken,
    stream: Writable
  ) {
    const config = this.config;
    const { encryptionKey, csv: csvConfig } = config;
    const logger = this.logger.get(`execute:${jobId}`);

    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
    const { data: dataPluginStart, discover: discoverPluginStart } = await this.startDeps;
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(fakeRequest);
    const columns = await locatorClient.columnsFromLocator(params);
    const searchSource = await locatorClient.searchSourceFromLocator(params);

    const [es, searchSourceStart] = await Promise.all([
      (await this.getEsClient()).asScoped(fakeRequest),
      await dataPluginStart.search.searchSource.asScoped(fakeRequest),
    ]);

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
  }
}
