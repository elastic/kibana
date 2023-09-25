/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IBasePath,
  Headers,
  Logger,
  CoreKibanaRequest,
  CoreSetup,
  FakeRawRequest,
  HttpServiceSetup,
  KibanaRequest,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  IClusterClient,
} from '@kbn/core/server';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { ReportingConfigType } from '../../config';
import { ReportingServerInfo } from '../../core';
import { CreateJobFn, ReportingStart, RunTaskFn } from '../../types';

export interface BaseExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
}

export interface BaseExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  screenshotting: ScreenshottingStart;
  reporting: ReportingStart;
}

export abstract class ExportType<
  JobParamsType extends object = any,
  TaskPayloadType extends object = any,
  SetupDepsType extends BaseExportTypeSetupDeps = BaseExportTypeSetupDeps,
  StartDepsType extends BaseExportTypeStartDeps = BaseExportTypeStartDeps
> {
  abstract id: string; // ID for exportTypesRegistry.getById()
  abstract name: string; // user-facing string
  abstract jobType: string; // for job params

  abstract jobContentEncoding?: 'base64' | 'csv';
  abstract jobContentExtension: 'pdf' | 'png' | 'csv';

  abstract createJob: CreateJobFn<JobParamsType>;
  abstract runTask: RunTaskFn<TaskPayloadType>;

  abstract validLicenses: LicenseType[];

  public setupDeps!: SetupDepsType;
  public startDeps!: StartDepsType;
  public http!: HttpServiceSetup;

  constructor(
    core: CoreSetup,
    public config: ReportingConfigType,
    public logger: Logger,
    public context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.http = core.http;
  }

  setup(setupDeps: SetupDepsType) {
    this.setupDeps = setupDeps;
  }
  start(startDeps: StartDepsType) {
    this.startDeps = startDeps;
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = this.startDeps;
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  // needed to be protected vs private for the csv search source immediate export type
  protected getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = this.startDeps;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  protected async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.setupDeps.spaces?.spacesService;
    const spaceId = this.startDeps.reporting.getSpaceId(request, logger);

    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  protected getFakeRequest(
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

  /*
   * Returns configurable server info
   */
  protected getServerInfo(): ReportingServerInfo {
    const serverInfo = this.http.getServerInfo();
    return {
      basePath: this.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }
}
