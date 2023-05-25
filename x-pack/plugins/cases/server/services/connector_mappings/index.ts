/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
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
import {
  ConnectorMappingsTransformedRt,
  ConnectorMappingsPartialRt,
} from '../../common/types/connector_mappings';
import { decodeOrThrow } from '../../../common/api';

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}

  public async find({
    unsecuredSavedObjectsClient,
    options,
  }: FindConnectorMappingsArgs): Promise<SavedObjectsFindResponse<ConnectorMappingsTransformed>> {
    try {
      this.log.debug(`Attempting to find all connector mappings`);
      const connectorMappings =
        await unsecuredSavedObjectsClient.find<ConnectorMappingsPersistedAttributes>({
          ...options,
          type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        });

      const validatedMappings: Array<SavedObjectsFindResult<ConnectorMappingsTransformed>> = [];

      for (const mapping of connectorMappings.saved_objects) {
        const validatedMapping = decodeOrThrow(ConnectorMappingsTransformedRt)(mapping.attributes);

        validatedMappings.push(Object.assign(mapping, { attributes: validatedMapping }));
      }

      return Object.assign(connectorMappings, { saved_objects: validatedMappings });
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

      const validatedAttributes = decodeOrThrow(ConnectorMappingsTransformedRt)(
        connectorMappings.attributes
      );

      return Object.assign(connectorMappings, { attributes: validatedAttributes });
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

      const validatedAttributes = decodeOrThrow(ConnectorMappingsPartialRt)(
        updatedMappings.attributes
      );

      return Object.assign(updatedMappings, { attributes: validatedAttributes });
    } catch (error) {
      this.log.error(`Error on UPDATE connector mappings ${mappingId}: ${error}`);
      throw error;
    }
  }
}
