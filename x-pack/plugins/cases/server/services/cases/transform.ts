/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { ESCaseAttributes, ExternalServicesWithoutConnectorId } from '.';
import {
  CaseSavedObjectReference,
  connectorIdReferenceName,
  pushConnectorIdReferenceName,
} from '..';
import { CaseAttributes, CaseFullExternalService, noneConnectorId } from '../../../common';
import {
  findConnectorIdReference,
  transformFieldsToESModel,
  transformESConnectorOrUseDefault,
  transformESConnectorToExternalModel,
} from '../transform';

export function transformUpdateResponsesToExternalModels(
  response: SavedObjectsBulkUpdateResponse<ESCaseAttributes>
): SavedObjectsBulkUpdateResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformUpdateResponseToExternalModel(so),
    })),
  };
}

export function transformUpdateResponseToExternalModel(
  updatedCase: SavedObjectsUpdateResponse<ESCaseAttributes>
): SavedObjectsUpdateResponse<CaseAttributes> {
  const { connector, external_service, ...restUpdateAttributes } = updatedCase.attributes ?? {};

  const transformedConnector = transformESConnectorToExternalModel({
    // if the saved object had an error the attributes field will not exist
    connector,
    references: updatedCase.references,
    referenceName: connectorIdReferenceName,
  });

  let externalService: CaseFullExternalService | null | undefined;

  // if external_service is not defined then we don't want to include it in the response since it wasn't passed it as an
  // attribute to update
  if (external_service !== undefined) {
    externalService = transformESExternalService(external_service, updatedCase.references);
  }

  return {
    ...updatedCase,
    attributes: {
      ...restUpdateAttributes,
      ...(transformedConnector && { connector: transformedConnector }),
      // if externalService is null that means we intentionally updated it to null within ES so return that as a valid value
      ...(externalService !== undefined && { external_service: externalService }),
    },
  };
}

export function transformAttributesToESModel(
  caseAttributes: CaseAttributes
): {
  attributes: ESCaseAttributes;
  references?: CaseSavedObjectReference[];
};
export function transformAttributesToESModel(
  caseAttributes: Partial<CaseAttributes>
): {
  attributes: Partial<ESCaseAttributes>;
  references?: CaseSavedObjectReference[];
};
export function transformAttributesToESModel(
  caseAttributes: Partial<CaseAttributes>
): {
  attributes: Partial<ESCaseAttributes>;
  references?: CaseSavedObjectReference[];
} {
  const { connector, external_service, ...restAttributes } = caseAttributes;

  let transformedAttributes: Partial<ESCaseAttributes> = { ...restAttributes };
  let pushConnectorId: string | undefined | null;

  if (external_service) {
    let restExternalService: ExternalServicesWithoutConnectorId | null | undefined;
    ({ connector_id: pushConnectorId, ...restExternalService } = external_service);
    transformedAttributes = {
      ...transformedAttributes,
      external_service: restExternalService,
    };
  } else if (external_service === null) {
    transformedAttributes = { ...transformedAttributes, external_service: null };
  }

  if (connector) {
    transformedAttributes = {
      ...transformedAttributes,
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    };
  }

  return {
    attributes: transformedAttributes,
    references: buildReferences(connector?.id, pushConnectorId),
  };
}

function buildReferences(
  connectorId?: string,
  pushConnectorId?: string | null
): CaseSavedObjectReference[] | undefined {
  const connectorRef: CaseSavedObjectReference[] = [];

  // this means the reference should be removed
  if (connectorId === noneConnectorId) {
    connectorRef.push({ name: connectorIdReferenceName });
  } else if (connectorId) {
    connectorRef.push({
      name: connectorIdReferenceName,
      ref: { id: connectorId, name: connectorIdReferenceName, type: ACTION_SAVED_OBJECT_TYPE },
    });
  }

  const pushConnectorRef: CaseSavedObjectReference[] = [];

  // this means the reference should be removed
  if (pushConnectorId === noneConnectorId) {
    pushConnectorRef.push({ name: pushConnectorIdReferenceName });
  } else if (pushConnectorId) {
    pushConnectorRef.push({
      name: pushConnectorIdReferenceName,
      ref: {
        id: pushConnectorId,
        name: pushConnectorIdReferenceName,
        type: ACTION_SAVED_OBJECT_TYPE,
      },
    });
  }

  const references = [...connectorRef, ...pushConnectorRef];

  return references.length > 0 ? references : undefined;
}

/**
 * Until Kibana uses typescript 4.3 or higher we'll have to keep these functions separate instead of using an overload
 * definition like this:
 *
 * export function transformArrayResponseToExternalModel(
 *  response: SavedObjectsBulkResponse<ESCaseAttributes> | SavedObjectsFindResponse<ESCaseAttributes>
 * ): SavedObjectsBulkResponse<CaseAttributes> | SavedObjectsFindResponse<CaseAttributes> {
 *
 * See this issue for more details: https://stackoverflow.com/questions/49510832/typescript-how-to-map-over-union-array-type
 */

export function transformBulkResponseToExternalModel(
  response: SavedObjectsBulkResponse<ESCaseAttributes>
): SavedObjectsBulkResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformSavedObjectToExternalModel(so),
    })),
  };
}

export function transformFindResponseToExternalModel(
  response: SavedObjectsFindResponse<ESCaseAttributes>
): SavedObjectsFindResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformSavedObjectToExternalModel(so),
    })),
  };
}

export function transformSavedObjectToExternalModel(
  caseSavedObject: SavedObject<ESCaseAttributes>
): SavedObject<CaseAttributes> {
  const connector = transformESConnectorOrUseDefault({
    // if the saved object had an error the attributes field will not exist
    connector: caseSavedObject.attributes?.connector,
    references: caseSavedObject.references,
    referenceName: connectorIdReferenceName,
  });

  const externalService = transformESExternalService(
    caseSavedObject.attributes?.external_service,
    caseSavedObject.references
  );

  return {
    ...caseSavedObject,
    attributes: {
      ...caseSavedObject.attributes,
      connector,
      external_service: externalService,
    },
  };
}

function transformESExternalService(
  // this type needs to match that of CaseFullExternalService except that it does not include the connector_id, see: x-pack/plugins/cases/common/api/cases/case.ts
  // that's why it can be null here
  externalService: ExternalServicesWithoutConnectorId | null | undefined,
  references: SavedObjectReference[] | undefined
): CaseFullExternalService | null {
  const connectorIdRef = findConnectorIdReference(pushConnectorIdReferenceName, references);

  if (!externalService) {
    return null;
  }

  return {
    ...externalService,
    connector_id: connectorIdRef?.id ?? null,
  };
}
