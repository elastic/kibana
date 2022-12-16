/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectReference, SavedObjectsClientContract } from '@kbn/core/server';

import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../../common/constants';
import type { ConnectorMappings } from '../../../common/api';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type { IndexRefresh } from '../types';

interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}
interface FindConnectorMappingsArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostConnectorMappingsArgs extends ClientArgs, IndexRefresh {
  attributes: ConnectorMappings;
  references: SavedObjectReference[];
}

interface UpdateConnectorMappingsArgs extends ClientArgs, IndexRefresh {
  mappingId: string;
  attributes: Partial<ConnectorMappings>;
  references: SavedObjectReference[];
}

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}

  public async find({ unsecuredSavedObjectsClient, options }: FindConnectorMappingsArgs) {
    try {
      this.log.debug(`Attempting to find all connector mappings`);
      return await unsecuredSavedObjectsClient.find<ConnectorMappings>({
        ...options,
        type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.error(`Attempting to find all connector mappings: ${error}`);
      throw error;
    }
  }

  public async post({
    unsecuredSavedObjectsClient,
    attributes,
    references,
    refresh,
  }: PostConnectorMappingsArgs) {
    try {
      this.log.debug(`Attempting to POST a new connector mappings`);
      return await unsecuredSavedObjectsClient.create<ConnectorMappings>(
        CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        attributes,
        {
          references,
          refresh,
        }
      );
    } catch (error) {
      this.log.error(`Error on POST a new connector mappings: ${error}`);
      throw error;
    }
  }

  public async update({
    unsecuredSavedObjectsClient,
    mappingId,
    attributes,
    references,
    refresh,
  }: UpdateConnectorMappingsArgs) {
    try {
      this.log.debug(`Attempting to UPDATE connector mappings ${mappingId}`);
      return await unsecuredSavedObjectsClient.update<ConnectorMappings>(
        CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        mappingId,
        attributes,
        {
          references,
          refresh,
        }
      );
    } catch (error) {
      this.log.error(`Error on UPDATE connector mappings ${mappingId}: ${error}`);
      throw error;
    }
  }
}
