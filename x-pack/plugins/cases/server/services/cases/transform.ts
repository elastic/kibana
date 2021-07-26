/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsFindResponse,
} from 'kibana/server';
import { ESCaseAttributes, ExternalServicesWithoutConnectorID } from '.';
import { connectorIDReferenceName, pushConnectorIDReferenceName } from '..';
import { CaseAttributes, CaseFullExternalService } from '../../../common';
import { findConnectorIDReference, transformStoredConnectorOrUseDefault } from '../transform';

function transformStoredExternalService(
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
  const connector = transformStoredConnectorOrUseDefault(
    // if the saved object had an error the attributes field will not exist
    caseSavedObject.attributes?.connector,
    caseSavedObject.references,
    connectorIDReferenceName
  );

  const externalService = transformStoredExternalService(
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
