/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { cloneDeep, unset } from 'lodash';
import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import { addOwnerToSO, SanitizedCaseOwner } from '.';
import { ESConnectorFields } from '../../services';
import { CaseAttributes, ConnectorTypes } from '../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import {
  transformConnectorIdToReference,
  transformPushConnectorIdToReference,
} from './user_actions/connector_id';
import { CASE_TYPE_INDIVIDUAL } from './constants';

interface UnsanitizedCaseConnector {
  connector_id: string;
}

interface SanitizedCaseConnector {
  connector: {
    id: string;
    name: string | null;
    type: string | null;
    fields: null | ESConnectorFields;
  };
}

interface SanitizedCaseSettings {
  settings: {
    syncAlerts: boolean;
  };
}

interface SanitizedCaseType {
  type: string;
}

interface ConnectorIdFields {
  connector?: { id?: string };
  external_service?: { connector_id?: string | null } | null;
}

export const caseConnectorIdMigration = (
  doc: SavedObjectUnsanitizedDoc<ConnectorIdFields>
): SavedObjectSanitizedDoc<unknown> => {
  // removing the id field since it will be stored in the references instead
  const { connector, external_service, ...restAttributes } = doc.attributes;

  const { transformedConnector, references: connectorReferences } = transformConnectorIdToReference(
    CONNECTOR_ID_REFERENCE_NAME,
    connector
  );

  const { transformedPushConnector, references: pushConnectorReferences } =
    transformPushConnectorIdToReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, external_service);

  const { references = [] } = doc;

  return {
    ...doc,
    attributes: {
      ...restAttributes,
      ...transformedConnector,
      ...transformedPushConnector,
    },
    references: [...references, ...connectorReferences, ...pushConnectorReferences],
  };
};

export const removeCaseType = (
  doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
): SavedObjectSanitizedDoc<unknown> => {
  const docCopy = cloneDeep(doc);
  unset(docCopy, 'attributes.type');

  return { ...docCopy, references: doc.references ?? [] };
};

export const addDuration = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<CaseAttributes & { duration: number | null }> => {
  let duration = null;

  try {
    const createdAt = doc.attributes.created_at;
    const closedAt = doc.attributes.closed_at;

    if (createdAt != null && closedAt != null) {
      const createdAtMillis = new Date(createdAt).getTime();
      const closedAtMillis = new Date(closedAt).getTime();

      if (!isNaN(createdAtMillis) && !isNaN(closedAtMillis) && closedAtMillis >= createdAtMillis) {
        duration = Math.floor((closedAtMillis - createdAtMillis) / 1000);
      }
    }
  } catch (err) {
    // Silence date errors
  }

  /**
   * Duration is the time from the creation of the case to the close of the case in seconds
   * If an error occurs or the case has not been close then the duration is set to null
   */
  return { ...doc, attributes: { ...doc.attributes, duration }, references: doc.references ?? [] };
};

export const caseMigrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedCaseConnector>
  ): SavedObjectSanitizedDoc<SanitizedCaseConnector> => {
    const { connector_id, ...attributesWithoutConnectorId } = doc.attributes;

    return {
      ...doc,
      attributes: {
        ...attributesWithoutConnectorId,
        connector: {
          id: connector_id ?? 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
      references: doc.references || [],
    };
  },
  '7.11.0': (
    doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
  ): SavedObjectSanitizedDoc<SanitizedCaseSettings> => {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        settings: {
          syncAlerts: true,
        },
      },
      references: doc.references || [],
    };
  },
  '7.12.0': (
    doc: SavedObjectUnsanitizedDoc<SanitizedCaseConnector>
  ): SavedObjectSanitizedDoc<SanitizedCaseType & SanitizedCaseConnector> => {
    const { fields, type } = doc.attributes.connector;
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        type: CASE_TYPE_INDIVIDUAL,
        connector: {
          ...doc.attributes.connector,
          fields:
            Array.isArray(fields) && fields.length > 0 && type === ConnectorTypes.serviceNowITSM
              ? [...fields, { key: 'category', value: null }, { key: 'subcategory', value: null }]
              : fields,
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
  '7.15.0': caseConnectorIdMigration,
  '8.1.0': removeCaseType,
  '8.3.0': addDuration,
};
