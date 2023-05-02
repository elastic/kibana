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

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { set } from '@kbn/safer-lodash-set';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import type { ConfigurationAttributes, ConfigurationPatchRequest } from '../../../common/api';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';
import {
  transformFieldsToESModel,
  transformESConnectorToExternalModel,
  transformESConnectorOrUseDefault,
} from '../transform';
import { ConnectorReferenceHandler } from '../connector_reference_handler';
import type {
  DeleteCaseConfigureArgs,
  FindCaseConfigureArgs,
  GetCaseConfigureArgs,
  PatchCaseConfigureArgs,
  PostCaseConfigureArgs,
} from './types';
import type {
  ConfigurationSavedObjectTransformed,
  ConfigurationTransformedAttributes,
  ConfigurePersistedAttributes,
} from '../../common/types/configure';

export class CaseConfigureService {
  constructor(private readonly log: Logger) {}

  public async delete({
    unsecuredSavedObjectsClient,
    configurationId,
    refresh,
  }: DeleteCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to DELETE case configure ${configurationId}`);
      return await unsecuredSavedObjectsClient.delete(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId,
        { refresh }
      );
    } catch (error) {
      this.log.debug(`Error on DELETE case configure ${configurationId}: ${error}`);
      throw error;
    }
  }

  public async get({
    unsecuredSavedObjectsClient,
    configurationId,
  }: GetCaseConfigureArgs): Promise<ConfigurationSavedObjectTransformed> {
    try {
      this.log.debug(`Attempting to GET case configuration ${configurationId}`);
      const configuration = await unsecuredSavedObjectsClient.get<ConfigurePersistedAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId
      );

      return transformToExternalModel(configuration);
    } catch (error) {
      this.log.debug(`Error on GET case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }

  public async find({
    unsecuredSavedObjectsClient,
    options,
  }: FindCaseConfigureArgs): Promise<SavedObjectsFindResponse<ConfigurationTransformedAttributes>> {
    try {
      this.log.debug(`Attempting to find all case configuration`);

      const findResp = await unsecuredSavedObjectsClient.find<ConfigurePersistedAttributes>({
        ...options,
        // Get the latest configuration
        sortField: 'created_at',
        sortOrder: 'desc',
        type: CASE_CONFIGURE_SAVED_OBJECT,
      });

      return transformFindResponseToExternalModel(findResp);
    } catch (error) {
      this.log.debug(`Attempting to find all case configuration`);
      throw error;
    }
  }

  public async post({
    unsecuredSavedObjectsClient,
    attributes,
    id,
    refresh,
  }: PostCaseConfigureArgs): Promise<ConfigurationSavedObjectTransformed> {
    try {
      this.log.debug(`Attempting to POST a new case configuration`);
      const esConfigInfo = transformAttributesToESModel(attributes);
      const createdConfig = await unsecuredSavedObjectsClient.create<ConfigurePersistedAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        esConfigInfo.attributes,
        { id, references: esConfigInfo.referenceHandler.build(), refresh }
      );

      return transformToExternalModel(createdConfig);
    } catch (error) {
      this.log.debug(`Error on POST a new case configuration: ${error}`);
      throw error;
    }
  }

  public async patch({
    unsecuredSavedObjectsClient,
    configurationId,
    updatedAttributes,
    originalConfiguration,
    refresh,
  }: PatchCaseConfigureArgs): Promise<
    SavedObjectsUpdateResponse<ConfigurationTransformedAttributes>
  > {
    try {
      this.log.debug(`Attempting to UPDATE case configuration ${configurationId}`);
      const esUpdateInfo = transformAttributesToESModel(updatedAttributes);

      const updatedConfiguration =
        await unsecuredSavedObjectsClient.update<ConfigurePersistedAttributes>(
          CASE_CONFIGURE_SAVED_OBJECT,
          configurationId,
          {
            ...esUpdateInfo.attributes,
          },
          {
            references: esUpdateInfo.referenceHandler.build(originalConfiguration.references),
            refresh,
          }
        );

      return transformUpdateResponseToExternalModel(updatedConfiguration);
    } catch (error) {
      this.log.debug(`Error on UPDATE case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }
}

function transformUpdateResponseToExternalModel(
  updatedConfiguration: SavedObjectsUpdateResponse<ConfigurePersistedAttributes>
): SavedObjectsUpdateResponse<ConfigurationPatchRequest> {
  const { connector, ...restUpdatedAttributes } = updatedConfiguration.attributes ?? {};

  const transformedConnector = transformESConnectorToExternalModel({
    connector,
    references: updatedConfiguration.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const castedAttributesWithoutConnector = restUpdatedAttributes as ConfigurationPatchRequest;

  const response = {
    ...updatedConfiguration,
    attributes: {
      closure_type: castedAttributesWithoutConnector.closure_type,
    },
  };

  if (transformedConnector) {
    set(response, 'attributes.connector', transformedConnector);
  }

  return response;
}

function transformToExternalModel(
  configuration: SavedObject<ConfigurePersistedAttributes>
): ConfigurationSavedObjectTransformed {
  const connector = transformESConnectorOrUseDefault({
    // if the saved object had an error the attributes field will not exist
    connector: configuration.attributes?.connector,
    references: configuration.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const castedAttributes = configuration.attributes as ConfigurationAttributes;

  return {
    ...configuration,
    attributes: {
      closure_type: castedAttributes.closure_type,
      created_at: castedAttributes.created_at,
      created_by: castedAttributes.created_by,
      owner: castedAttributes.owner,
      updated_at: castedAttributes.updated_at,
      updated_by: castedAttributes.updated_by,
      connector,
    },
  };
}

function transformFindResponseToExternalModel(
  configurations: SavedObjectsFindResponse<ConfigurePersistedAttributes>
): SavedObjectsFindResponse<ConfigurationTransformedAttributes> {
  return {
    ...configurations,
    saved_objects: configurations.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so),
    })),
  };
}

function transformAttributesToESModel(configuration: ConfigurationAttributes): {
  attributes: ConfigurePersistedAttributes;
  referenceHandler: ConnectorReferenceHandler;
};
function transformAttributesToESModel(configuration: Partial<ConfigurationAttributes>): {
  attributes: Partial<ConfigurePersistedAttributes>;
  referenceHandler: ConnectorReferenceHandler;
};
function transformAttributesToESModel(configuration: Partial<ConfigurationAttributes>): {
  attributes: Partial<ConfigurePersistedAttributes>;
  referenceHandler: ConnectorReferenceHandler;
} {
  const { connector, ...restWithoutConnector } = configuration;

  const transformedConnector = {
    ...(connector && {
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    }),
  };

  return {
    attributes: {
      ...restWithoutConnector,
      ...transformedConnector,
    },
    referenceHandler: buildReferenceHandler(connector?.id),
  };
}

function buildReferenceHandler(id?: string): ConnectorReferenceHandler {
  return new ConnectorReferenceHandler([
    { id, name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
  ]);
}
