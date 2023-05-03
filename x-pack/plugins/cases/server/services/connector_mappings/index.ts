/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../../common/constants';
import type {
  FindConnectorMappingsArgs,
  PostConnectorMappingsArgs,
  UpdateConnectorMappingsArgs,
} from './types';
import type {
  ConnectorMappingsPersistedAttributes,
  ConnectorMappingsSavedObjectTransformed,
  ConnectorMappingsTransformed,
} from '../../common/types/connector_mappings';
import type { ConnectorMappings, ConnectorMappingsAttributes } from '../../../common/api';

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}

  public async find({
    unsecuredSavedObjectsClient,
    options,
  }: FindConnectorMappingsArgs): Promise<SavedObjectsFindResponse<ConnectorMappings>> {
    try {
      this.log.debug(`Attempting to find all connector mappings`);
      const connectorMappings =
        await unsecuredSavedObjectsClient.find<ConnectorMappingsPersistedAttributes>({
          ...options,
          type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        });

      return transformFindResponseToExternalModel(connectorMappings);
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
  }: PostConnectorMappingsArgs): Promise<ConnectorMappingsSavedObjectTransformed> {
    try {
      this.log.debug(`Attempting to POST a new connector mappings`);
      const connectorMappings =
        await unsecuredSavedObjectsClient.create<ConnectorMappingsPersistedAttributes>(
          CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
          attributes,
          {
            references,
            refresh,
          }
        );

      return transformToExternalModel(connectorMappings);
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
  }: UpdateConnectorMappingsArgs): Promise<
    SavedObjectsUpdateResponse<ConnectorMappingsTransformed>
  > {
    try {
      this.log.debug(`Attempting to UPDATE connector mappings ${mappingId}`);
      const updatedMappings =
        await unsecuredSavedObjectsClient.update<ConnectorMappingsPersistedAttributes>(
          CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
          mappingId,
          attributes,
          {
            references,
            refresh,
          }
        );

      return transformUpdateResponseToExternalModel(updatedMappings);
    } catch (error) {
      this.log.error(`Error on UPDATE connector mappings ${mappingId}: ${error}`);
      throw error;
    }
  }
}

const transformToExternalModel = (
  so: SavedObject<ConnectorMappingsPersistedAttributes>
): ConnectorMappingsSavedObjectTransformed => {
  const attributes = so.attributes as ConnectorMappings;

  return {
    ...so,
    attributes: {
      mappings: getMappings(attributes.mappings),
      owner: attributes.owner,
    },
  };
};

const getMappings = (mappings: ConnectorMappingsAttributes[]) => {
  return mappings.map((mapping) => ({
    action_type: mapping.action_type,
    source: mapping.source,
    target: mapping.target,
  }));
};

const transformFindResponseToExternalModel = (
  response: SavedObjectsFindResponse<ConnectorMappingsPersistedAttributes>
): SavedObjectsFindResponse<ConnectorMappings> => {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so),
    })),
  };
};

const transformUpdateResponseToExternalModel = (
  response: SavedObjectsUpdateResponse<ConnectorMappingsPersistedAttributes>
): SavedObjectsUpdateResponse<ConnectorMappingsTransformed> => {
  const attributes = response.attributes as Partial<ConnectorMappingsTransformed>;

  return {
    ...response,
    attributes: {
      ...(attributes.mappings !== undefined && { mappings: attributes.mappings }),
      ...(attributes.owner !== undefined && { owner: attributes.owner }),
    },
  };
};
