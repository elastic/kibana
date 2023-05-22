/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreKibanaRequest,
  CoreSetup,
  CoreStart,
  FakeRawRequest,
  KibanaRequest,
  Logger,
  Headers,
  IBasePath,
  SavedObjectsServiceStart,
  SavedObjectsClientContract,
  UiSettingsServiceStart,
  IClusterClient,
} from '@kbn/core/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import * as Rx from 'rxjs';
import type { CancellationToken } from '@kbn/reporting-common';
import type { Writable } from 'stream';
import { CsvGenerator } from '@kbn/generate-csv';
import { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from '../../../common/types';
import { ReportingConfigType } from '../../config';
import { ReportTaskParams } from '../../lib/tasks';
import { decryptJobHeaders } from '../common';
import { getFieldFormats } from '../../services';

interface CsvExportSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
}

interface CsvExportStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
}

export class CsvExportType {
  private pluginSetupDeps?: CsvExportSetupDeps;
  private pluginStartDeps?: CsvExportStartDeps;
  private readonly pluginStart$ = new Rx.ReplaySubject<CsvExportStartDeps>();
  config: ReportingConfigType | undefined;

  constructor(private logger: Logger) {
    this.logger = logger.get('csv-export');
  }

  setup(coreSetup: CoreSetup, setupDeps: CsvExportSetupDeps) {
    this.config = this.getConfig();
  }

  start(coreStart: CoreStart, startDeps: CsvExportStartDeps) {}

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

  /*
   * Gives synchronous access to the config
   */
  public getConfig = () => this.config;

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

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = await this.getPluginStartDeps();
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  public async getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = await this.getPluginStartDeps();
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
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

  public async getEsClient() {
    const startDeps = await this.getPluginStartDeps();
    return startDeps.esClient;
  }

  createJob(jobParams: JobParamsCsvFromSavedObject) {
    // Create the payload that gets stored in .kibana-reporting-*
    return {
      ...jobParams,
      forceNow: new Date().toISOString(),
    };
  }

  // this is going to replace the runtask factory
  // x-pack/plugins/reporting/server/export_types/csv_v2/execute_job.ts
  runTask(
    jobId: string,
    job: TaskPayloadCsvFromSavedObject,
    payload: ReportTaskParams<TaskPayloadCsvFromSavedObject>['payload'],
    cancellationToken: CancellationToken,
    stream: Writable,
    _logger: Logger
  ) {
    const config = this.getConfig();
    const { encryptionKey, csvConfig } = config;

    return async () => {
      const logger = _logger.get(`execute:${jobId}`);

      const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
      const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
      const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
      const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
      const { data: dataPluginStart, discover: discoverPluginStart } =
        await this.getPluginStartDeps();

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
    };
  }
}
