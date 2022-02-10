/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { CaseConnector, ConnectorTypeFields } from '../../common/api';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../actions/server';
import { getNoneCaseConnector } from '../common/utils';
import { ESCaseConnector, ESConnectorFields } from '.';

export function findConnectorIdReference(
  name: string,
  references?: SavedObjectReference[]
): SavedObjectReference | undefined {
  return references?.find((ref) => ref.type === ACTION_SAVED_OBJECT_TYPE && ref.name === name);
}

export function transformESConnectorToExternalModel({
  connector,
  references,
  referenceName,
}: {
  connector?: ESCaseConnector;
  references?: SavedObjectReference[];
  referenceName: string;
}): CaseConnector | undefined {
  const connectorIdRef = findConnectorIdReference(referenceName, references);
  return transformConnectorFieldsToExternalModel(connector, connectorIdRef?.id);
}

function transformConnectorFieldsToExternalModel(
  connector?: ESCaseConnector,
  connectorId?: string
): CaseConnector | undefined {
  if (!connector) {
    return;
  }

  // if the connector is valid, but we can't find it's ID in the reference, then it must be malformed
  // or it was a none connector which doesn't have a reference (a none connector doesn't point to any actual connector
  // saved object)
  if (!connectorId) {
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
    id: connectorId,
    name: connector.name,
    ...connectorTypeField,
  };
}

export function transformESConnectorOrUseDefault({
  connector,
  references,
  referenceName,
}: {
  connector?: ESCaseConnector;
  references?: SavedObjectReference[];
  referenceName: string;
}): CaseConnector {
  return (
    transformESConnectorToExternalModel({ connector, references, referenceName }) ??
    getNoneCaseConnector()
  );
}

export function transformFieldsToESModel(connector: CaseConnector): ESConnectorFields {
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
