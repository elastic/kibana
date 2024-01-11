/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { createMaintenanceWindow } from '../application/maintenance_window/methods/create/create_maintenance_window';
import type { CreateMaintenanceWindowParams } from '../application/maintenance_window/methods/create/types';
import { getMaintenanceWindow } from '../application/maintenance_window/methods/get/get_maintenance_window';
import type { GetMaintenanceWindowParams } from '../application/maintenance_window/methods/get/types';
import { updateMaintenanceWindow } from '../application/maintenance_window/methods/update/update_maintenance_window';
import type { UpdateMaintenanceWindowParams } from '../application/maintenance_window/methods/update/types';
import { findMaintenanceWindows } from '../application/maintenance_window/methods/find/find_maintenance_windows';
import type { FindMaintenanceWindowsResult } from '../application/maintenance_window/methods/find/types';
import { deleteMaintenanceWindow } from '../application/maintenance_window/methods/delete/delete_maintenance_window';
import type { DeleteMaintenanceWindowParams } from '../application/maintenance_window/methods/delete/types';
import { archiveMaintenanceWindow } from '../application/maintenance_window/methods/archive/archive_maintenance_window';
import type { ArchiveMaintenanceWindowParams } from '../application/maintenance_window/methods/archive/types';
import { getActiveMaintenanceWindows } from '../application/maintenance_window/methods/get_active/get_active_maintenance_windows';
import { finishMaintenanceWindow } from '../application/maintenance_window/methods/finish/finish_maintenance_window';
import type { FinishMaintenanceWindowParams } from '../application/maintenance_window/methods/finish/types';
import { bulkGetMaintenanceWindows } from '../application/maintenance_window/methods/bulk_get/bulk_get_maintenance_windows';
import type {
  BulkGetMaintenanceWindowsParams,
  BulkGetMaintenanceWindowsResult,
} from '../application/maintenance_window/methods/bulk_get/types';
import {
  MaintenanceWindowModificationMetadata,
  MaintenanceWindowClientContext,
} from '../../common';
import type { MaintenanceWindow } from '../application/maintenance_window/types';

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

  public create = (params: CreateMaintenanceWindowParams): Promise<MaintenanceWindow> =>
    createMaintenanceWindow(this.context, params);
  public get = (params: GetMaintenanceWindowParams): Promise<MaintenanceWindow> =>
    getMaintenanceWindow(this.context, params);
  public update = (params: UpdateMaintenanceWindowParams): Promise<MaintenanceWindow> =>
    updateMaintenanceWindow(this.context, params);
  public find = (): Promise<FindMaintenanceWindowsResult> => findMaintenanceWindows(this.context);
  public delete = (params: DeleteMaintenanceWindowParams): Promise<{}> =>
    deleteMaintenanceWindow(this.context, params);
  public archive = (params: ArchiveMaintenanceWindowParams): Promise<MaintenanceWindow> =>
    archiveMaintenanceWindow(this.context, params);
  public finish = (params: FinishMaintenanceWindowParams): Promise<MaintenanceWindow> =>
    finishMaintenanceWindow(this.context, params);
  public bulkGet = (
    params: BulkGetMaintenanceWindowsParams
  ): Promise<BulkGetMaintenanceWindowsResult> => bulkGetMaintenanceWindows(this.context, params);
  public getActiveMaintenanceWindows = (): Promise<MaintenanceWindow[]> =>
    getActiveMaintenanceWindows(this.context);
}
