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
  caseConfigureId: string;
}
interface FindConnectorMappingsArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostConnectorMappingsArgs extends ClientArgs {
  attributes: ConnectorMappings;
  references: SavedObjectReference[];
}

interface PatchConnectorMappingsArgs extends ClientArgs {
  caseConfigureId: string;
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
    delete: async ({ client, caseConfigureId }: GetConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to DELETE case configure ${caseConfigureId}`);
        return await client.delete(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, caseConfigureId);
      } catch (error) {
        this.log.debug(`Error on DELETE case configure ${caseConfigureId}: ${error}`);
        throw error;
      }
    },
    get: async ({ client, caseConfigureId }: GetConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to GET connector mappings ${caseConfigureId}`);
        return await client.get(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, caseConfigureId);
      } catch (error) {
        this.log.debug(`Error on GET connector mappings ${caseConfigureId}: ${error}`);
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
    patch: async ({ client, caseConfigureId, updatedAttributes }: PatchConnectorMappingsArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE connector mappings ${caseConfigureId}`);
        return await client.update(CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT, caseConfigureId, {
          ...updatedAttributes,
        });
      } catch (error) {
        this.log.debug(`Error on UPDATE connector mappings ${caseConfigureId}: ${error}`);
        throw error;
      }
    },
  });
}
