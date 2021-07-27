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
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { ESCaseAttributes, ExternalServicesWithoutConnectorID } from '.';
import { connectorIDReferenceName, pushConnectorIDReferenceName } from '..';
import { CaseAttributes, CaseFullExternalService, noneConnectorId } from '../../../common';
import {
  findConnectorIDReference,
  transformFieldsToESModel,
  transformESConnectorOrUseDefault,
  transformESConnector,
} from '../transform';

export function transformUpdateResponseToExternalModel(
  updatedCase: SavedObjectsUpdateResponse<ESCaseAttributes>
): SavedObjectsUpdateResponse<CaseAttributes> {
  const { connector, external_service, ...restUpdateAttributes } = updatedCase.attributes ?? {};

  const transformedConnector = transformESConnector(
    // if the saved object had an error the attributes field will not exist
    connector,
    updatedCase.references,
    connectorIDReferenceName
  );

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

export function transformCreateAttributesToESModel(
  caseAttributes: CaseAttributes
): {
  attributes: ESCaseAttributes;
  references?: SavedObjectReference[];
};
export function transformCreateAttributesToESModel(
  caseAttributes: Partial<CaseAttributes>
): {
  attributes: Partial<ESCaseAttributes>;
  references?: SavedObjectReference[];
};
export function transformCreateAttributesToESModel(
  caseAttributes: Partial<CaseAttributes>
): {
  attributes: Partial<ESCaseAttributes>;
  references?: SavedObjectReference[];
} {
  const { connector, external_service, ...restAttributes } = caseAttributes;

  let pushConnectorID: string | undefined;
  let restExternalService: ExternalServicesWithoutConnectorID | null = null;

  if (external_service) {
    ({ connector_id: pushConnectorID, ...restExternalService } = external_service);
  }

  const transformedConnector = connector && {
    name: connector.name,
    type: connector.type,
    fields: transformFieldsToESModel(connector),
  };

  return {
    attributes: {
      ...restAttributes,
      ...(transformedConnector && { connector: transformedConnector }),
      external_service: restExternalService,
    },
    references: buildReferences(connector?.id, pushConnectorID),
  };
}

function buildReferences(
  connectorID?: string,
  pushConnectorID?: string
): SavedObjectReference[] | undefined {
  const connectorRef =
    connectorID && connectorID !== noneConnectorId
      ? [{ id: connectorID, name: connectorIDReferenceName, type: ACTION_SAVED_OBJECT_TYPE }]
      : [];
  const pushConnectorRef = pushConnectorID
    ? [{ id: pushConnectorID, name: pushConnectorIDReferenceName, type: ACTION_SAVED_OBJECT_TYPE }]
    : [];

  const references = [...connectorRef, ...pushConnectorRef];

  return references.length > 0 ? references : undefined;
}

export function transformCaseArrayResponseToExternalModel(
  response: SavedObjectsFindResponse<ESCaseAttributes>
): SavedObjectsFindResponse<CaseAttributes>;
export function transformCaseArrayResponseToExternalModel(
  response: SavedObjectsBulkResponse<ESCaseAttributes>
): SavedObjectsBulkResponse<CaseAttributes>;
export function transformCaseArrayResponseToExternalModel(
  response: SavedObjectsBulkResponse<ESCaseAttributes> | SavedObjectsFindResponse<ESCaseAttributes>
): SavedObjectsBulkResponse<CaseAttributes> | SavedObjectsFindResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformCaseSavedObjectToExternalModel(so),
    })),
  };
}

export function transformCaseSavedObjectToExternalModel(
  caseSavedObject: SavedObject<ESCaseAttributes>
): SavedObject<CaseAttributes> {
  const connector = transformESConnectorOrUseDefault(
    // if the saved object had an error the attributes field will not exist
    caseSavedObject.attributes?.connector,
    caseSavedObject.references,
    connectorIDReferenceName
  );

  const externalService = transformESExternalService(
    caseSavedObject.attributes?.external_service,
    caseSavedObject.references
  );

  return {
    ...caseSavedObject,
    attributes: {
      ...caseSavedObject.attributes,
      connector,
      // force the value to be null here because we can't have a partial response
      external_service: externalService ?? null,
    },
  };
}

function transformESExternalService(
  // this type needs to match that of CaseFullExternalService except that it does not include the connector_id, see: x-pack/plugins/cases/common/api/cases/case.ts
  // that's why it can be null here
  externalService: ExternalServicesWithoutConnectorID | null | undefined,
  references: SavedObjectReference[] | undefined
): CaseFullExternalService | null {
  const connectorIDRef = findConnectorIDReference(pushConnectorIDReferenceName, references);

  if (!externalService || !connectorIDRef) {
    return null;
  }

  return {
    ...externalService,
    connector_id: connectorIDRef.id,
  };
}
