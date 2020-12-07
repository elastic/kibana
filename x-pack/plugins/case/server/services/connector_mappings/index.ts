/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

import { ConnectorMappings, SavedObjectFindOptions } from '../../../common/api';
import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../saved_object_types';

interface ClientArgs {
  client: SavedObjectsClientContract;
}

interface GetConnectorMappingsArgs extends ClientArgs {
  mappingsId: string;
}
interface FindConnectorMappingsArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostConnectorMappingsArgs extends ClientArgs {
  attributes: ConnectorMappings;
  references: SavedObjectReference[];
}

interface PatchConnectorMappingsArgs extends ClientArgs {
  mappingsId: string;
  updatedAttributes: Partial<ConnectorMappings>;
}

export interface ConnectorMappingsServiceSetup {
  delete(args: GetConnectorMappingsArgs): Promise<{}>;
  get(args: GetConnectorMappingsArgs): Promise<SavedObject<ConnectorMappings>>;
  find(args: FindConnectorMappingsArgs): Promise<SavedObjectsFindResponse<ConnectorMappings>>;
  patch(args: PatchConnectorMappingsArgs): Promise<SavedObjectsUpdateResponse<ConnectorMappings>>;
  post(args: PostConnectorMappingsArgs): Promise<SavedObject<ConnectorMappings>>;
}

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}
  public setup = async (): Promise<ConnectorMappingsServiceSetup> => ({
    delete: async ({ client, mappingsId }: GetConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to DELETE connector mapping ${mappingsId}`);
        return await client.delete(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, mappingsId);
      } catch (error) {
        this.log.debug(`Error on DELETE connector mapping ${mappingsId}: ${error}`);
        throw error;
      }
    },
    get: async ({ client, mappingsId }: GetConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to GET connector mappings ${mappingsId}`);
        return await client.get(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, mappingsId);
      } catch (error) {
        this.log.debug(`Error on GET connector mappings ${mappingsId}: ${error}`);
        throw error;
      }
    },
    find: async ({ client, options }: FindConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to find all connector mappings`);
        return await client.find({ ...options, type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT });
      } catch (error) {
        this.log.debug(`Attempting to find all connector mappings`);
        throw error;
      }
    },
    post: async ({ client, attributes, references }: PostConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to POST a new connector mappings`);
        return await client.create(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, attributes, {
          references,
        });
      } catch (error) {
        this.log.debug(`Error on POST a new connector mappings: ${error}`);
        throw error;
      }
    },
    patch: async ({ client, mappingsId, updatedAttributes }: PatchConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE connector mappings ${mappingsId}`);
        return await client.update(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, mappingsId, {
          ...updatedAttributes,
        });
      } catch (error) {
        this.log.debug(`Error on UPDATE connector mappings ${mappingsId}: ${error}`);
        throw error;
      }
    },
  });
}
