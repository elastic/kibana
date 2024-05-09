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
  ConnectorMappingsAttributesTransformed,
} from '../../common/types/connector_mappings';
import {
  ConnectorMappingsAttributesPartialRt,
  ConnectorMappingsAttributesTransformedRt,
} from '../../common/types/connector_mappings';
import { decodeOrThrow } from '../../common/runtime_types';

export class ConnectorMappingsService {
  constructor(private readonly log: Logger) {}

  public async find({
    unsecuredSavedObjectsClient,
    options,
  }: FindConnectorMappingsArgs): Promise<
    SavedObjectsFindResponse<ConnectorMappingsAttributesTransformed>
  > {
    try {
      this.log.debug(`Attempting to find all connector mappings`);
      const connectorMappings =
        await unsecuredSavedObjectsClient.find<ConnectorMappingsPersistedAttributes>({
          ...options,
          type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
        });

      const validatedMappings: Array<
        SavedObjectsFindResult<ConnectorMappingsAttributesTransformed>
      > = [];

      for (const mapping of connectorMappings.saved_objects) {
        const validatedMapping = decodeOrThrow(ConnectorMappingsAttributesTransformedRt)(
          mapping.attributes
        );

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

      const decodedAttributes = decodeOrThrow(ConnectorMappingsAttributesTransformedRt)(attributes);

      const connectorMappings =
        await unsecuredSavedObjectsClient.create<ConnectorMappingsPersistedAttributes>(
          CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
          decodedAttributes,
          {
            references,
            refresh,
          }
        );

      const validatedAttributes = decodeOrThrow(ConnectorMappingsAttributesTransformedRt)(
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
    SavedObjectsUpdateResponse<ConnectorMappingsAttributesTransformed>
  > {
    try {
      this.log.debug(`Attempting to UPDATE connector mappings ${mappingId}`);

      const decodedAttributes = decodeOrThrow(ConnectorMappingsAttributesPartialRt)(attributes);

      const updatedMappings =
        await unsecuredSavedObjectsClient.update<ConnectorMappingsPersistedAttributes>(
          CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
          mappingId,
          decodedAttributes,
          {
            references,
            refresh,
          }
        );

      const validatedAttributes = decodeOrThrow(ConnectorMappingsAttributesPartialRt)(
        updatedMappings.attributes
      );

      return Object.assign(updatedMappings, { attributes: validatedAttributes });
    } catch (error) {
      this.log.error(`Error on UPDATE connector mappings ${mappingId}: ${error}`);
      throw error;
    }
  }
}
