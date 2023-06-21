/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeRawRequest, KibanaRequest } from '@kbn/core-http-server';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import {
  CoreSetup,
  Logger,
  PluginInitializerContext,
  IBasePath,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
  HttpServiceSetup,
  SavedObjectsClientContract,
  CoreKibanaRequest,
  Headers,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { CreateJobFn, RunTaskFn } from '../../types';
import { ReportingConfigType } from '../../config';
import { ReportingServerInfo } from '../../core';

export { decryptJobHeaders } from './decrypt_job_headers';
export { getFullUrls } from './get_full_urls';
export { validateUrls } from './validate_urls';
export { generatePngObservable } from './generate_png';
export { getCustomLogo } from './get_custom_logo';

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export interface ExportTypesType<
  SetupDeps = any,
  StartDeps = any,
  JobParamsType extends object = any,
  TaskPayloadType extends object = any
> {
  id: string; // ID for exportTypesRegistry.get()
  name: string; // user-facing string
  jobType: string; // for job params

  jobContentEncoding?: 'base64' | 'csv';
  jobContentExtension: 'pdf' | 'png' | 'csv';

  validLicenses: LicenseType[];

  setup: (setupDeps: SetupDeps) => void;
  start: (startDeps: StartDeps) => void;

  createJob: CreateJobFn<JobParamsType>;
  runTask: RunTaskFn<TaskPayloadType>;
}

/**
 * @TODO move to be within @kbn-reporting-export-types
 */
export interface ExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
}

export interface ExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  screenshotting: ScreenshottingStart;
}

export abstract class ExportType {
  public setupDeps!: ExportTypeSetupDeps;
  public startDeps!: ExportTypeStartDeps;
  public http!: HttpServiceSetup;

  constructor(
    core: CoreSetup,
    public config: ReportingConfigType,
    public logger: Logger,
    public context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.http = core.http;
  }

  setup(setupDeps: ExportTypeSetupDeps) {
    this.setupDeps = setupDeps;
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

  /*
   * Returns configurable server info
   */
  public getServerInfo(): ReportingServerInfo {
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
