/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { create, CreateParams } from './methods/create';
import { get, GetParams } from './methods/get';
import { update, UpdateParams } from './methods/update';
import { find, FindResult } from './methods/find';
import { deleteMaintenanceWindow, DeleteParams } from './methods/delete';
import { archive, ArchiveParams } from './methods/archive';
import { getActiveMaintenanceWindows } from './methods/get_active_maintenance_windows';
import { finish, FinishParams } from './methods/finish';
import { bulkGet, BulkGetParams, BulkGetResult } from './methods/bulk_get';

import {
  MaintenanceWindow,
  MaintenanceWindowModificationMetadata,
  MaintenanceWindowClientContext,
} from '../../common';

export interface MaintenanceWindowClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getUserName: () => Promise<string | null>;
}

export class MaintenanceWindowClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getUserName: () => Promise<string | null>;
  private readonly context: MaintenanceWindowClientContext;

  constructor(options: MaintenanceWindowClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getUserName = options.getUserName;
    this.context = {
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      getModificationMetadata: this.getModificationMetadata.bind(this),
    };
  }

  private async getModificationMetadata(): Promise<MaintenanceWindowModificationMetadata> {
    const createTime = Date.now();
    const userName = await this.getUserName();

    return {
      createdBy: userName,
      updatedBy: userName,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
    };
  }

  public create = (params: CreateParams): Promise<MaintenanceWindow> =>
    create(this.context, params);
  public get = (params: GetParams): Promise<MaintenanceWindow> => get(this.context, params);
  public update = (params: UpdateParams): Promise<MaintenanceWindow> =>
    update(this.context, params);
  public find = (): Promise<FindResult> => find(this.context);
  public delete = (params: DeleteParams): Promise<{}> =>
    deleteMaintenanceWindow(this.context, params);
  public archive = (params: ArchiveParams): Promise<MaintenanceWindow> =>
    archive(this.context, params);
  public finish = (params: FinishParams): Promise<MaintenanceWindow> =>
    finish(this.context, params);
  public bulkGet = (params: BulkGetParams): Promise<BulkGetResult> => bulkGet(this.context, params);
  public getActiveMaintenanceWindows = (): Promise<MaintenanceWindow[]> =>
    getActiveMaintenanceWindows(this.context);
}
