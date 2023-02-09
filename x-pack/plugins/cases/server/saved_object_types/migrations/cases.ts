/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { cloneDeep, unset, flow } from 'lodash';
import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import type { SanitizedCaseOwner } from '.';
import { addOwnerToSO } from '.';
import type { ESConnectorFields } from '../../services';
import type { CaseAttributes } from '../../../common/api';
import { CaseSeverity, ConnectorTypes } from '../../../common/api';

import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SEVERITY_EXTERNAL_TO_ESMODEL,
  STATUS_EXTERNAL_TO_ESMODEL,
} from '../../common/constants';
import {
  transformConnectorIdToReference,
  transformPushConnectorIdToReference,
} from './user_actions/connector_id';
import { CASE_TYPE_INDIVIDUAL } from './constants';
import { pipeMigrations } from './utils';
import { ESCaseSeverity, ESCaseStatus } from '../../services/cases/types';

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
  doc: SavedObjectUnsanitizedDoc<Omit<CaseAttributes, 'duration'>>
): SavedObjectSanitizedDoc<CaseAttributes> => {
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
   * If an error occurs or the case has not been closed then the duration is set to null
   */
  return { ...doc, attributes: { ...doc.attributes, duration }, references: doc.references ?? [] };
};

export const addSeverity = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<CaseAttributes> => {
  const severity = doc.attributes.severity ?? CaseSeverity.LOW;
  return { ...doc, attributes: { ...doc.attributes, severity }, references: doc.references ?? [] };
};

export const addAssignees = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<CaseAttributes> => {
  const assignees = doc.attributes.assignees ?? [];
  return { ...doc, attributes: { ...doc.attributes, assignees }, references: doc.references ?? [] };
};

export const convertSeverity = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<Omit<CaseAttributes, 'severity'> & { severity: ESCaseSeverity }> => {
  const severity = SEVERITY_EXTERNAL_TO_ESMODEL[doc.attributes.severity] ?? ESCaseSeverity.LOW;
  return {
    ...doc,
    attributes: { ...doc.attributes, severity },
    references: doc.references ?? [],
  };
};

export const convertStatus = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<Omit<CaseAttributes, 'status'> & { status: ESCaseStatus }> => {
  const status = STATUS_EXTERNAL_TO_ESMODEL[doc.attributes?.status] ?? ESCaseStatus.OPEN;
  return {
    ...doc,
    attributes: { ...doc.attributes, status },
    references: doc.references ?? [],
  };
};

export const addTotalAlerts = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<CaseAttributes & { total_alerts: number }> => {
  const total_alerts = -1;
  return {
    ...doc,
    attributes: { ...doc.attributes, total_alerts },
    references: doc.references ?? [],
  };
};

export const addTotalComments = (
  doc: SavedObjectUnsanitizedDoc<CaseAttributes>
): SavedObjectSanitizedDoc<CaseAttributes & { total_comments: number }> => {
  const total_comments = -1;
  return {
    ...doc,
    attributes: { ...doc.attributes, total_comments },
    references: doc.references ?? [],
  };
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
  '8.3.0': pipeMigrations(addDuration, addSeverity),
  '8.5.0': addAssignees,
  '8.7.0': flow(convertSeverity, convertStatus, addTotalAlerts, addTotalComments),
};
