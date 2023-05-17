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
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  Headers,
  UiSettingsServiceStart,
  Logger,
} from '@kbn/core/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import * as Rx from 'rxjs';
import { createConfig, ReportingConfigType } from '../../config';
import { CreateJobFn, RunTaskFn } from '../../types';
import { CreateJobFnFactory, RunTaskFnFactory } from './execute_job';

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
  private pluginSetupDeps?: CsvCoreSetup;
  private pluginStartDeps?: CsvCoreStart;
  private config: ReportingConfigType;
  private readonly pluginStart$ = new Rx.ReplaySubject<CsvCoreStart>(); // observe async background startDeps

  constructor(
    private core: CoreSetup,
    private logger: Logger,
    private context: PluginInitializerContext<ReportingConfigType>
  ) {
    const config = createConfig(core, context.config.get<ReportingConfigType>(), logger);
    this.config = config;
  }

  /*
   * Gives synchronous access to the setupDeps
   */
  public getPluginSetupDeps() {
    if (!this.pluginSetupDeps) {
      throw new Error(`"pluginSetupDeps" dependencies haven't initialized yet`);
    }
    return this.pluginSetupDeps;
  }

  /*
   * Gives async access to the startDeps
   */
  public async getPluginStartDeps() {
    if (this.pluginStartDeps) {
      return this.pluginStartDeps;
    }

    return await Rx.firstValueFrom(this.pluginStart$);
  }

  public async getDataViewsService(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    const savedObjectsClient = savedObjects.getScopedClient(request);
    const { indexPatterns } = await this.getDataService();
    const { asCurrentUser: esClient } = (await this.getEsClient()).asScoped(request);
    const dataViews = await indexPatterns.dataViewsServiceFactory(savedObjectsClient, esClient);

    return dataViews;
  }

  public async getDataService() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.data;
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

    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.getPluginSetupDeps().basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }

    return fakeRequest;
  }

  public async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
    const spaceId = this.getSpaceId(request, logger);
    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return await this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  public async getEsClient() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.esClient;
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.getPluginSetupDeps().spaces?.spacesService;
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

export interface ExportTypeDefinitionCsv<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType> | null; // immediate job does not have a "create" phase
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
