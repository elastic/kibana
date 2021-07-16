/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

import { SavedObjectFindOptionsKueryNode } from '../../common';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CasesConfigureAttributes,
  CaseConnector,
  CasesConfigurePatch,
  ESConnectorFields,
  ESCaseConnectorNoID,
} from '../../../common';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { connectorIDReferenceName } from '..';
import { transformStoredConnector, transformStoredConnectorOrUseDefault } from '../transform';

interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

interface GetCaseConfigureArgs extends ClientArgs {
  configurationId: string;
}
interface FindCaseConfigureArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostCaseConfigureArgs extends ClientArgs {
  attributes: CasesConfigureAttributes;
  id: string;
}

interface PatchCaseConfigureArgs extends ClientArgs {
  configurationId: string;
  updatedAttributes: Partial<CasesConfigureAttributes>;
}

function transformUpdateToExternalModel(
  updatedConfiguration: SavedObjectsUpdateResponse<ESCasesConfigureAttributes>
): SavedObjectsUpdateResponse<CasesConfigurePatch> {
  const { connector, ...restUpdatedAttributes } = updatedConfiguration.attributes ?? {};

  const transformedConnector = transformStoredConnector(
    connector,
    updatedConfiguration.references,
    connectorIDReferenceName
  );

  return {
    ...updatedConfiguration,
    attributes: {
      ...restUpdatedAttributes,
      // this will avoid setting connector to undefined, it won't include to field at all
      ...(transformedConnector && { connector: transformedConnector }),
    },
  };
}

function transformToExternalModel(
  configuration: SavedObject<ESCasesConfigureAttributes>
): SavedObject<CasesConfigureAttributes> {
  const connector = transformStoredConnectorOrUseDefault(
    // if the saved object had an error the attributes field will not exist
    configuration.attributes?.connector,
    configuration.references,
    connectorIDReferenceName
  );

  return {
    ...configuration,
    attributes: {
      ...configuration.attributes,
      connector,
    },
  };
}

function transformFindToExternalModel(
  configurations: SavedObjectsFindResponse<ESCasesConfigureAttributes>
): SavedObjectsFindResponse<CasesConfigureAttributes> {
  return {
    ...configurations,
    saved_objects: configurations.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so),
    })),
  };
}

function transformFieldsToESModel(connector: CaseConnector): ESConnectorFields {
  if (!connector.fields) {
    return [];
  }

  return Object.entries(connector.fields).reduce<ESConnectorFields>(
    (acc, [key, value]) => [
      ...acc,
      {
        key,
        value,
      },
    ],
    []
  );
}

function buildReferences(id: string): SavedObjectReference[] | undefined {
  return id !== 'none'
    ? [
        {
          id,
          name: connectorIDReferenceName,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : undefined;
}

// TODO: figure out if we can use a conditional type here
function transformCreateAttributesToESModel(
  configuration: CasesConfigureAttributes
): {
  attributes: ESCasesConfigureAttributes;
  references?: SavedObjectReference[];
} {
  const { connector, ...restWithoutConnector } = configuration;

  return {
    attributes: {
      ...restWithoutConnector,
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    },
    references: buildReferences(connector.id),
  };
}

function transformUpdateAttributesToESModel(
  configuration: Partial<CasesConfigureAttributes>
): {
  attributes: Partial<ESCasesConfigureAttributes>;
  references?: SavedObjectReference[];
} {
  const { connector, ...restWithoutConnector } = configuration;
  if (!connector) {
    return {
      attributes: {
        ...restWithoutConnector,
      },
    };
  }

  return {
    attributes: {
      ...restWithoutConnector,
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    },
    references: buildReferences(connector.id),
  };
}

// TODO: add comment
export type ESCasesConfigureAttributes = Omit<CasesConfigureAttributes, 'connector'> & {
  connector: ESCaseConnectorNoID;
};

export class CaseConfigureService {
  constructor(private readonly log: Logger) {}

  public async delete({ unsecuredSavedObjectsClient, configurationId }: GetCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to DELETE case configure ${configurationId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_CONFIGURE_SAVED_OBJECT, configurationId);
    } catch (error) {
      this.log.debug(`Error on DELETE case configure ${configurationId}: ${error}`);
      throw error;
    }
  }

  public async get({
    unsecuredSavedObjectsClient,
    configurationId,
  }: GetCaseConfigureArgs): Promise<SavedObject<CasesConfigureAttributes>> {
    try {
      this.log.debug(`Attempting to GET case configuration ${configurationId}`);
      const configuration = await unsecuredSavedObjectsClient.get<ESCasesConfigureAttributes>(
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
  }: FindCaseConfigureArgs): Promise<SavedObjectsFindResponse<CasesConfigureAttributes>> {
    try {
      this.log.debug(`Attempting to find all case configuration`);

      const findResp = await unsecuredSavedObjectsClient.find<ESCasesConfigureAttributes>({
        ...options,
        // Get the latest configuration
        sortField: 'created_at',
        sortOrder: 'desc',
        type: CASE_CONFIGURE_SAVED_OBJECT,
      });

      return transformFindToExternalModel(findResp);
    } catch (error) {
      this.log.debug(`Attempting to find all case configuration`);
      throw error;
    }
  }

  public async post({
    unsecuredSavedObjectsClient,
    attributes,
    id,
  }: PostCaseConfigureArgs): Promise<SavedObject<CasesConfigureAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new case configuration`);
      const esConfigInfo = transformCreateAttributesToESModel(attributes);
      const createdConfig = await unsecuredSavedObjectsClient.create<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        {
          ...esConfigInfo.attributes,
        },
        { id, references: esConfigInfo.references }
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
  }: PatchCaseConfigureArgs): Promise<SavedObjectsUpdateResponse<CasesConfigurePatch>> {
    try {
      this.log.debug(`Attempting to UPDATE case configuration ${configurationId}`);
      const esUpdateInfo = transformUpdateAttributesToESModel(updatedAttributes);

      const updatedConfiguration = await unsecuredSavedObjectsClient.update<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId,
        {
          ...esUpdateInfo.attributes,
        },
        {
          references: esUpdateInfo.references,
        }
      );

      return transformUpdateToExternalModel(updatedConfiguration);
    } catch (error) {
      this.log.debug(`Error on UPDATE case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }
}
