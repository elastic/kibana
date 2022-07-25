/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import { ConnectorTypes } from '../../../common/api';
import { addOwnerToSO, SanitizedCaseOwner } from '.';
import { CONNECTOR_ID_REFERENCE_NAME } from '../../common/constants';
import { transformConnectorIdToReference } from './user_actions/connector_id';

interface UnsanitizedConfigureConnector {
  connector_id: string;
  connector_name: string;
}

interface SanitizedConfigureConnector {
  connector: {
    id: string;
    name: string | null;
    type: string | null;
    fields: null;
  };
}

export const configureConnectorIdMigration = (
  doc: SavedObjectUnsanitizedDoc<{ connector?: { id: string } }>
): SavedObjectSanitizedDoc<unknown> => {
  // removing the id field since it will be stored in the references instead
  const { connector, ...restAttributes } = doc.attributes;
  const { transformedConnector, references: connectorReferences } = transformConnectorIdToReference(
    CONNECTOR_ID_REFERENCE_NAME,
    connector
  );
  const { references = [] } = doc;

  return {
    ...doc,
    attributes: {
      ...restAttributes,
      ...transformedConnector,
    },
    references: [...references, ...connectorReferences],
  };
};

export const configureMigrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedConfigureConnector>
  ): SavedObjectSanitizedDoc<SanitizedConfigureConnector> => {
    const { connector_id, connector_name, ...restAttributes } = doc.attributes;

    return {
      ...doc,
      attributes: {
        ...restAttributes,
        connector: {
          id: connector_id ?? 'none',
          name: connector_name ?? 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
      references: doc.references || [],
    };
  },
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
    return addOwnerToSO(doc);
  },
  '7.15.0': configureConnectorIdMigration,
};
