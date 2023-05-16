/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreKibanaRequest,
  CoreSetup,
  FakeRawRequest,
  IBasePath,
  IClusterClient,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  Headers,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';

import { CsvGenerator } from '@kbn/generate-csv';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { TaskPayloadCsvFromSavedObject } from '../../../common/types';
import { createConfig, ReportingConfigType } from '../../config';
import { getFieldFormats } from '../../services';
import type { RunTaskFn } from '../../types';
import { decryptJobHeaders } from '../common';

export type RunTaskFnFactory<RunTaskFnType> = (reporting: CsvCore, logger: Logger) => RunTaskFnType;

type RunTaskFnType = RunTaskFn<TaskPayloadCsvFromSavedObject>;

export interface CsvCoreSetup {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
}

export interface CsvCoreStart {
  savedObjects: SavedObjectsServiceStart;
  data: DataPluginStart;
  esClient: IClusterClient;
  discover: DiscoverServerPluginStart;
  uiSettings: UiSettingsServiceStart;
}

export class CsvCore {
  savedObjects!: CsvCoreStart['savedObjects'];
  data!: CsvCoreStart['data'];
  esClient!: CsvCoreStart['esClient'];
  spaces!: CsvCoreSetup['spaces'];
  config: ReportingConfigType;
  basePath!: CsvCoreSetup['basePath'];
  discover!: CsvCoreStart['discover'];
  uiSettings!: CsvCoreStart['uiSettings'];

  constructor(
    private core: CoreSetup,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  public async getDataViewsService(request: KibanaRequest) {
    const savedObjectsClient = this.savedObjects.getScopedClient(request);
    const { indexPatterns } = await this.getDataService();
    const { asCurrentUser: esClient } = (await this.getEsClient()).asScoped(request);
    const dataViews = await indexPatterns.dataViewsServiceFactory(savedObjectsClient, esClient);

    return dataViews;
  }

  getDataService() {
    return this.data;
  }

  /*
   * Gives synchronous access to the config
   */
  public getConfig(): ReportingConfigType {
    return this.config;
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

    const spacesService = this.spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }

    return fakeRequest;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.spaces?.spacesService;
    const spaceId = this.getSpaceId(request, logger);
    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return await this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const uiSettingsService = await this.uiSettings;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getEsClient() {
    return this.esClient;
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    return this.savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.spaces?.spacesService;
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
}

export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: CsvCore,
  logger: Logger
) => CreateJobFnType;

export const runTaskFnFactory: RunTaskFnFactory<RunTaskFnType> = (reporting, _logger) => {
  const config = reporting.getConfig();
  const { encryptionKey, csv: csvConfig } = config;

  return async function runTask(jobId, job, cancellationToken, stream) {
    const logger = _logger.get(`execute:${jobId}`);

    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = reporting.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await reporting.getUiSettingsClient(fakeRequest, logger);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
    const { data: dataPluginStart, discover: discoverPluginStart } = await reporting;
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(fakeRequest);
    const columns = await locatorClient.columnsFromLocator(params);
    const searchSource = await locatorClient.searchSourceFromLocator(params);

    const [es, searchSourceStart] = await Promise.all([
      (await reporting.getEsClient()).asScoped(fakeRequest),
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
  };
};
