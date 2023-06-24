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
import {
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
} from '../../../common/constants';
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

export abstract class ExportType<
  JobParamsType extends object = any,
  TaskPayloadType extends object = any
> {
  abstract id: string; // ID for exportTypesRegistry.get()
  abstract name: string; // user-facing string
  abstract jobType: string; // for job params

  abstract jobContentEncoding?: 'base64' | 'csv';
  abstract jobContentExtension: 'pdf' | 'png' | 'csv';

  abstract createJob: CreateJobFn<JobParamsType>;
  abstract runTask: RunTaskFn<TaskPayloadType>;

  abstract validLicenses: LicenseType[];

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
  start(startDeps: ExportTypeStartDeps) {
    this.startDeps = startDeps;
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
    const spaceId = this.getSpaceId(request, logger);

    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return this.getUiSettingsServiceFactory(savedObjectsClient);
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
