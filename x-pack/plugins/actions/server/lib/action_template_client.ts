/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectAttributes,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
  SavedObjectsUtils,
} from '@kbn/core/server';
import { ACTION_TEMPLATE_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

interface ConstructorOptions {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface CreateOptions {
  name: string;
  template: string;
  connectorId?: string;
  connectorTypeId: string;
}

export interface ActionTemplate extends SavedObjectAttributes {
  name: string;
  template: string;
  connectorId?: string;
  connectorTypeId: string;
}

export interface UpdateOptions {
  id: string;
  template: string;
}

export class ActionTemplateClient {
  private readonly logger: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;

  constructor({ unsecuredSavedObjectsClient, logger }: ConstructorOptions) {
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.logger = logger;
  }

  public async create({
    name,
    connectorId,
    connectorTypeId,
    template,
  }: CreateOptions): Promise<ActionTemplate> {
    const id = SavedObjectsUtils.generateId();
    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        ACTION_TEMPLATE_SAVED_OBJECT_TYPE,
        {
          name,
          connectorId,
          connectorTypeId,
          template,
        },
        { id }
      );

      return result.attributes as ActionTemplate;
    } catch (err) {
      this.logger.error(`Failed to create action_template - ${err.message}`);
      throw err;
    }
  }

  public async getTemplates(connectorTypeId: string): Promise<ActionTemplate[]> {
    try {
      const result = await this.unsecuredSavedObjectsClient.find<ActionTemplate>({
        perPage: 100,
        type: ACTION_TEMPLATE_SAVED_OBJECT_TYPE,
        filter: `${ACTION_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.connectorTypeId: "${connectorTypeId}"`,
      });
      return result.saved_objects.map(
        (so: SavedObjectsFindResult<ActionTemplate>) => so.attributes
      );
    } catch (err) {
      this.logger.error(
        `Failed to get action templates for connectorTypeId "${connectorTypeId}" - ${err.message}`
      );
      return [];
    }
  }
}
