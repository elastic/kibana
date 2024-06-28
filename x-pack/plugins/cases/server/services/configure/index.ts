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
import type { ConfigurationAttributes } from '../../../common/types/domain';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { decodeOrThrow } from '../../common/runtime_types';
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
  ConfigurationPersistedAttributes,
} from '../../common/types/configure';
import {
  ConfigurationPartialAttributesRt,
  ConfigurationTransformedAttributesRt,
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
      await unsecuredSavedObjectsClient.delete(CASE_CONFIGURE_SAVED_OBJECT, configurationId, {
        refresh,
      });
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
      const configuration = await unsecuredSavedObjectsClient.get<ConfigurationPersistedAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId
      );

      return transformToExternalAndValidate(configuration);
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
      const findResp = await unsecuredSavedObjectsClient.find<ConfigurationPersistedAttributes>({
        ...options,
        // Get the latest configuration
        sortField: 'created_at',
        sortOrder: 'desc',
        type: CASE_CONFIGURE_SAVED_OBJECT,
      });

      const transformedConfigs = transformFindResponseToExternalModel(findResp);

      const validatedConfigs: ConfigurationSavedObjectTransformed[] = [];
      for (const config of transformedConfigs.saved_objects) {
        const validatedAttributes = decodeOrThrow(ConfigurationTransformedAttributesRt)(
          config.attributes
        );

        validatedConfigs.push(Object.assign(config, { attributes: validatedAttributes }));
      }

      return Object.assign(transformedConfigs, { saved_objects: validatedConfigs });
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

      const decodedAttributes = decodeOrThrow(ConfigurationTransformedAttributesRt)(attributes);

      const esConfigInfo = transformAttributesToESModel(decodedAttributes);

      const createdConfig =
        await unsecuredSavedObjectsClient.create<ConfigurationPersistedAttributes>(
          CASE_CONFIGURE_SAVED_OBJECT,
          esConfigInfo.attributes,
          { id, references: esConfigInfo.referenceHandler.build(), refresh }
        );

      return transformToExternalAndValidate(createdConfig);
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

      const decodedAttributes = decodeOrThrow(ConfigurationPartialAttributesRt)(updatedAttributes);

      const esUpdateInfo = transformAttributesToESModel(decodedAttributes);

      const updatedConfiguration =
        await unsecuredSavedObjectsClient.update<ConfigurationPersistedAttributes>(
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

      const transformedConfig = transformUpdateResponseToExternalModel(updatedConfiguration);

      const validatedAttributes = decodeOrThrow(ConfigurationPartialAttributesRt)(
        transformedConfig.attributes
      );

      return Object.assign(transformedConfig, { attributes: validatedAttributes });
    } catch (error) {
      this.log.debug(`Error on UPDATE case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }
}

const transformToExternalAndValidate = (
  configuration: SavedObject<ConfigurationPersistedAttributes>
) => {
  const transformedConfig = transformToExternalModel(configuration);
  const validatedAttributes = decodeOrThrow(ConfigurationTransformedAttributesRt)(
    transformedConfig.attributes
  );

  return Object.assign(transformedConfig, { attributes: validatedAttributes });
};

function transformUpdateResponseToExternalModel(
  updatedConfiguration: SavedObjectsUpdateResponse<ConfigurationPersistedAttributes>
): SavedObjectsUpdateResponse<ConfigurationTransformedAttributes> {
  const { connector, ...restUpdatedAttributes } = updatedConfiguration.attributes ?? {};

  const transformedConnector = transformESConnectorToExternalModel({
    connector,
    references: updatedConfiguration.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const attributes = restUpdatedAttributes as Partial<
    Omit<ConfigurationTransformedAttributes, 'connector'>
  >;

  return {
    ...updatedConfiguration,
    attributes: {
      ...attributes,
      ...(transformedConnector && { connector: transformedConnector }),
    },
  };
}

function transformToExternalModel(
  configuration: SavedObject<ConfigurationPersistedAttributes>
): ConfigurationSavedObjectTransformed {
  const connector = transformESConnectorOrUseDefault({
    connector: configuration.attributes.connector,
    references: configuration.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const castedAttributes = configuration.attributes as ConfigurationTransformedAttributes;
  const customFields = !configuration.attributes.customFields
    ? []
    : (configuration.attributes.customFields as ConfigurationTransformedAttributes['customFields']);

  return {
    ...configuration,
    attributes: {
      ...castedAttributes,
      connector,
      customFields,
    },
  };
}

function transformFindResponseToExternalModel(
  configurations: SavedObjectsFindResponse<ConfigurationPersistedAttributes>
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
  attributes: ConfigurationPersistedAttributes;
  referenceHandler: ConnectorReferenceHandler;
};
function transformAttributesToESModel(configuration: Partial<ConfigurationAttributes>): {
  attributes: Partial<ConfigurationPersistedAttributes>;
  referenceHandler: ConnectorReferenceHandler;
};
function transformAttributesToESModel(configuration: Partial<ConfigurationAttributes>): {
  attributes: Partial<ConfigurationPersistedAttributes>;
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
