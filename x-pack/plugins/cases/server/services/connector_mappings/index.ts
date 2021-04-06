/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference, SavedObjectsClientContract } from 'kibana/server';

import { ConnectorMappings, SavedObjectFindOptions } from '../../../common/api';
import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../../common/constants';

interface ClientArgs {
  soClient: SavedObjectsClientContract;
}
interface FindConnectorMappingsArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostConnectorMappingsArgs extends ClientArgs {
  attributes: ConnectorMappings;
  references: SavedObjectReference[];
}

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}

  public async find({ soClient, options }: FindConnectorMappingsArgs) {
    try {
      this.log.debug(`Attempting to find all connector mappings`);
      return await soClient.find<ConnectorMappings>({
        ...options,
        type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.error(`Attempting to find all connector mappings: ${error}`);
      throw error;
    }
  }

  public async post({ soClient, attributes, references }: PostConnectorMappingsArgs) {
    try {
      this.log.debug(`Attempting to POST a new connector mappings`);
      return await soClient.create<ConnectorMappings>(
        CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        attributes,
        {
          references,
        }
      );
    } catch (error) {
      this.log.error(`Error on POST a new connector mappings: ${error}`);
      throw error;
    }
  }
}
