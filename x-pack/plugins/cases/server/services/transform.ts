/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { CaseConnector, ConnectorTypeFields, ESCaseConnectorNoID } from '../../common';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../actions/server';
import { getNoneCaseConnector } from '../common';

function formatStoredConnectorFields(
  connector?: ESCaseConnectorNoID,
  connectorID?: string
): CaseConnector | undefined {
  if (!connector) {
    return;
  }

  // if the connector is valid, but we can't find it's ID in the reference, then it must be malformed
  // or it was a none connector which doesn't have a reference (a none connector doesn't point to any actual connector
  // saved object)
  if (!connectorID) {
    return getNoneCaseConnector();
  }

  const connectorTypeField = {
    type: connector.type,
    fields:
      connector.fields != null && connector.fields.length > 0
        ? connector.fields.reduce(
            (fields, { key, value }) => ({
              ...fields,
              [key]: value,
            }),
            {}
          )
        : null,
  } as ConnectorTypeFields;

  return {
    id: connectorID,
    name: connector.name,
    ...connectorTypeField,
  };
}

// TODO: add comments
export function findConnectorIDReference(
  name: string,
  references?: SavedObjectReference[]
): SavedObjectReference | undefined {
  return references?.find((ref) => ref.type === ACTION_SAVED_OBJECT_TYPE && ref.name === name);
}

export function transformStoredConnector(
  connector: ESCaseConnectorNoID | undefined,
  references: SavedObjectReference[] | undefined,
  referenceName: string
): CaseConnector | undefined {
  const connectorIDRef = findConnectorIDReference(referenceName, references);
  return formatStoredConnectorFields(connector, connectorIDRef?.id);
}

export function transformStoredConnectorOrUseDefault(
  connector: ESCaseConnectorNoID | undefined,
  references: SavedObjectReference[] | undefined,
  referenceName: string
): CaseConnector {
  return transformStoredConnector(connector, references, referenceName) ?? getNoneCaseConnector();
}
