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
} from 'kibana/server';

import { ConnectorMappings, SavedObjectFindOptions } from '../../../common/api';
import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../saved_object_types';

interface ClientArgs {
  client: SavedObjectsClientContract;
}
interface FindConnectorMappingsArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostConnectorMappingsArgs extends ClientArgs {
  attributes: ConnectorMappings;
  references: SavedObjectReference[];
}

export interface ConnectorMappingsServiceSetup {
  find(args: FindConnectorMappingsArgs): Promise<SavedObjectsFindResponse<ConnectorMappings>>;
  post(args: PostConnectorMappingsArgs): Promise<SavedObject<ConnectorMappings>>;
}

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}
  public setup = async (): Promise<ConnectorMappingsServiceSetup> => ({
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
  });
}
