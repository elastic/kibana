/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObjectsClientContract, Logger, SavedObject } from '@kbn/core/server';
import type { Integration, IntegrationCreateRequest } from '../../../common/integrations';
import { integrationTypeName, type IntegrationAttributes } from '../../saved_objects/integrations';
import type { ClientUser } from './types';
import { savedObjectToModel, createRequestToRaw, updateToAttributes } from './convert_model';

interface IntegrationClientOptions {
  logger: Logger;
  client: SavedObjectsClientContract;
  user: ClientUser;
}

export type IntegrationUpdatableFields = Partial<
  Pick<Integration, 'name' | 'description' | 'configuration'>
>;

export interface IntegrationClient {
  list(): Promise<Integration[]>;
  get(options: { integrationId: string }): Promise<Integration>;
  create(integration: IntegrationCreateRequest): Promise<Integration>;
  update(integrationId: string, fields: IntegrationUpdatableFields): Promise<Integration>;
  delete(integrationId: string): Promise<void>;
}

export class IntegrationClientImpl implements IntegrationClient {
  private readonly client: SavedObjectsClientContract;
  private readonly user: ClientUser;
  // @ts-ignore will be used later
  private readonly logger: Logger;

  constructor({ client, user, logger }: IntegrationClientOptions) {
    this.client = client;
    this.user = user;
    this.logger = logger;
  }

  async list(): Promise<Integration[]> {
    const { saved_objects: results } = await this.client.find<IntegrationAttributes>({
      type: integrationTypeName,
      perPage: 1000,
    });

    return results.map(savedObjectToModel);
  }

  async get({ integrationId }: { integrationId: string }): Promise<Integration> {
    const integrationSo = await this._rawGet({ integrationId });
    return savedObjectToModel(integrationSo);
  }

  async create(integration: IntegrationCreateRequest): Promise<Integration> {
    const now = new Date();
    const id = integration.id ?? uuidv4();
    const attributes = createRequestToRaw({
      integration,
      id,
      user: this.user,
      creationDate: now,
    });
    const created = await this.client.create<IntegrationAttributes>(
      integrationTypeName,
      attributes,
      { id }
    );
    return savedObjectToModel(created);
  }

  async update(
    integrationId: string,
    updatedFields: IntegrationUpdatableFields
  ): Promise<Integration> {
    const integrationSo = await this._rawGet({ integrationId });
    const updatedAttributes = {
      ...integrationSo.attributes,
      ...updateToAttributes({ updatedFields }),
    };

    await this.client.update<IntegrationAttributes>(
      integrationTypeName,
      integrationSo.id,
      updatedAttributes
    );

    return savedObjectToModel({
      ...integrationSo,
      attributes: updatedAttributes,
    });
  }

  async delete(integrationId: string): Promise<void> {
    const integrationSo = await this._rawGet({ integrationId });
    await this.client.delete(integrationTypeName, integrationSo.id);
  }

  private async _rawGet({
    integrationId,
  }: {
    integrationId: string;
  }): Promise<SavedObject<IntegrationAttributes>> {
    const { saved_objects: results } = await this.client.find<IntegrationAttributes>({
      type: integrationTypeName,
      filter: `${integrationTypeName}.attributes.integration_id: ${integrationId}`,
    });
    if (results.length > 0) {
      return results[0];
    }
    throw new Error(`Integration ${integrationId} not found`);
  }
}
