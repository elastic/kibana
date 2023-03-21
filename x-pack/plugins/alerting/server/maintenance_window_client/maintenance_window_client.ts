/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import Boom from '@hapi/boom';
import { Logger, SavedObjectsClientContract, SavedObjectsUtils } from '@kbn/core/server';
import { buildKueryNodeFilter } from '../rules_client/common';
import { generateMaintenanceWindowEvents } from './generate_maintenance_window_events';
import {
  MaintenanceWindowSavedObject,
  MaintenanceWindow,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  RRuleParams,
} from '../../common';

export interface MaintenanceWindowClientConstructorOptions {
  readonly logger: Logger;
  readonly savedObjectsClient: SavedObjectsClientContract;
  readonly getUserName: () => Promise<string | null>;
}

export interface CreateParams {
  title: string;
  duration: number;
  rRule: RRuleParams;
}

export interface UpdateParams {
  id: string;
  title: string;
  enabled: boolean;
  duration: number;
  rRule: RRuleParams;
}

export interface GetParams {
  id: string;
}

export interface DeleteParams {
  id: string;
}

export interface FindParams {
  filter?: string;
}

export interface ArchiveParams {
  id: string;
}

export class MaintenanceWindowClient {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly getUserName: () => Promise<string | null>;

  constructor(options: MaintenanceWindowClientConstructorOptions) {
    this.logger = options.logger;
    this.savedObjectsClient = options.savedObjectsClient;
    this.getUserName = options.getUserName;
  }

  private async getModificationMetadata() {
    const createTime = Date.now();
    const userName = await this.getUserName();

    return {
      createdBy: userName,
      updatedBy: userName,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
    };
  }

  public async create(params: CreateParams): Promise<MaintenanceWindow> {
    const { title, duration, rRule } = params;
    const id = SavedObjectsUtils.generateId();
    const modificationMetadata = await this.getModificationMetadata();
    const expirationDate = moment().add(1, 'year').toISOString();

    try {
      const result = await this.savedObjectsClient.create<MaintenanceWindowSavedObject>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        {
          title,
          enabled: true,
          archived: false,
          expirationDate,
          rRule,
          duration,
          events: generateMaintenanceWindowEvents({ rRule, expirationDate, duration }),
          ...modificationMetadata,
        },
        {
          id,
        }
      );
      return {
        id: result.id,
        ...result.attributes,
      };
    } catch (e) {
      const errorMessage = `Failed to create maintenance window, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async get(params: GetParams): Promise<MaintenanceWindow> {
    const { id } = params;
    try {
      const result = await this.savedObjectsClient.get<MaintenanceWindow>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        id
      );

      return {
        ...result.attributes,
        id: result.id,
      };
    } catch (e) {
      const errorMessage = `Failed to get maintenance window by id: ${id}, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async update(params: UpdateParams): Promise<Partial<MaintenanceWindow>> {
    const { id, title, enabled, duration, rRule } = params;
    const modificationMetadata = await this.getModificationMetadata();
    const expirationDate = moment().add(1, 'year').toISOString();

    try {
      const { attributes, version } = await this.savedObjectsClient.get<MaintenanceWindow>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        id
      );
      const result = await this.savedObjectsClient.update<MaintenanceWindow>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        id,
        {
          ...attributes,
          title,
          enabled,
          expirationDate,
          duration,
          rRule,
          events: generateMaintenanceWindowEvents({ rRule, expirationDate, duration }),
          ...modificationMetadata,
        },
        {
          version,
        }
      );
      return {
        ...result.attributes,
        id: result.id,
      };
    } catch (e) {
      const errorMessage = `Failed to update maintenance window by id: ${id}, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async find(params: FindParams): Promise<{ data: MaintenanceWindow[] }> {
    const { filter } = params;
    const filterKueryNode = buildKueryNodeFilter(filter);

    try {
      const result = await this.savedObjectsClient.find<MaintenanceWindow>({
        type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        filter: filterKueryNode,
      });

      return {
        data: result.saved_objects.map((so) => ({
          ...so.attributes,
          id: so.id,
        })),
      };
    } catch (e) {
      const errorMessage = `Failed to find maintenance window: Filter: ${filter}, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async delete(params: DeleteParams): Promise<{}> {
    const { id } = params;
    try {
      return await this.savedObjectsClient.delete(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE, id);
    } catch (e) {
      const errorMessage = `Failed to delete maintenance window by id: ${id}, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async archive(params: ArchiveParams): Promise<Partial<MaintenanceWindow>> {
    const { id } = params;
    const modificationMetadata = await this.getModificationMetadata();

    try {
      const { attributes, version } = await this.savedObjectsClient.get<MaintenanceWindow>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        id
      );
      const result = await this.savedObjectsClient.update<MaintenanceWindow>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        id,
        {
          ...attributes,
          archived: true,
          ...modificationMetadata,
        },
        {
          version,
        }
      );
      return {
        ...result.attributes,
        id: result.id,
      };
    } catch (e) {
      const errorMessage = `Failed to archive maintenance window by id: ${id}, Error: ${e}`;
      this.logger.error(errorMessage);
      throw Boom.boomify(e, { message: errorMessage });
    }
  }

  public async active() {
    // TODO
  }
}
