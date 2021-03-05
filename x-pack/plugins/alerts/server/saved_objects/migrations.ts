/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from '../../../../../src/core/server';
import { RawAlert, RawAlertAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import {
  APP_ID as SIEM_APP_ID,
  SERVER_APP_ID as SIEM_SERVER_APP_ID,
} from '../../../security_solution/common/constants';

export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
) => SavedObjectUnsanitizedDoc<RawAlert>;

const SUPPORT_INCIDENTS_ACTION_TYPES = ['.servicenow', '.jira', '.resilient'];

export const isAnyActionSupportIncidents = (doc: SavedObjectUnsanitizedDoc<RawAlert>): boolean =>
  doc.attributes.actions.some((action) =>
    SUPPORT_INCIDENTS_ACTION_TYPES.includes(action.actionTypeId)
  );

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationWhenRBACWasIntroduced = encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    function shouldBeMigrated(doc): doc is SavedObjectUnsanitizedDoc<RawAlert> {
      // migrate all documents in 7.10 in order to add the "meta" RBAC field
      return true;
    },
    pipeMigrations(
      markAsLegacyAndChangeConsumer,
      setAlertIdAsDefaultDedupkeyOnPagerDutyActions,
      initializeExecutionStatus
    )
  );

  const migrationAlertUpdatedAtAndNotifyWhen = encryptedSavedObjects.createMigration<
    RawAlert,
    RawAlert
  >(
    // migrate all documents in 7.11 in order to add the "updatedAt" and "notifyWhen" fields
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    pipeMigrations(setAlertUpdatedAtDate, setNotifyWhen)
  );

  const migrationActions7112 = encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isAnyActionSupportIncidents(doc),
    pipeMigrations(restructureConnectorsThatSupportIncident)
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationWhenRBACWasIntroduced, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationAlertUpdatedAtAndNotifyWhen, '7.11.0'),
    '7.11.2': executeMigrationWithErrorHandling(migrationActions7112, '7.11.2'),
  };
}

function executeMigrationWithErrorHandling(
  migrationFunc: SavedObjectMigrationFn<RawAlert, RawAlert>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunc(doc, context);
    } catch (ex) {
      context.log.error(
        `encryptedSavedObject ${version} migration failed for alert ${doc.id} with error: ${ex.message}`,
        { alertDocument: doc }
      );
    }
    return doc;
  };
}

const setAlertUpdatedAtDate = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> => {
  const updatedAt = doc.updated_at || doc.attributes.createdAt;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      updatedAt,
    },
  };
};

const setNotifyWhen = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> => {
  const notifyWhen = doc.attributes.throttle ? 'onThrottleInterval' : 'onActiveAlert';
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      notifyWhen,
    },
  };
};

const consumersToChange: Map<string, string> = new Map(
  Object.entries({
    alerting: 'alerts',
    metrics: 'infrastructure',
    [SIEM_APP_ID]: SIEM_SERVER_APP_ID,
  })
);

function markAsLegacyAndChangeConsumer(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const {
    attributes: { consumer },
  } = doc;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      consumer: consumersToChange.get(consumer) ?? consumer,
      // mark any alert predating 7.10 as a legacy alert
      meta: {
        versionApiKeyLastmodified: LEGACY_LAST_MODIFIED_VERSION,
      },
    },
  };
}

function setAlertIdAsDefaultDedupkeyOnPagerDutyActions(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const { attributes } = doc;
  return {
    ...doc,
    attributes: {
      ...attributes,
      ...(attributes.actions
        ? {
            actions: attributes.actions.map((action) => {
              if (action.actionTypeId !== '.pagerduty' || action.params.eventAction === 'trigger') {
                return action;
              }
              return {
                ...action,
                params: {
                  ...action.params,
                  dedupKey: action.params.dedupKey ?? '{{alertId}}',
                },
              };
            }),
          }
        : {}),
    },
  };
}

function initializeExecutionStatus(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const { attributes } = doc;
  return {
    ...doc,
    attributes: {
      ...attributes,
      executionStatus: {
        status: 'pending',
        lastExecutionDate: new Date().toISOString(),
        error: null,
      },
    },
  };
}

function restructureConnectorsThatSupportIncident(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const { actions } = doc.attributes;
  const newActions = actions.reduce((acc, action) => {
    if (action.params.subAction !== 'pushToService') {
      return [...acc, action];
    }

    if (action.actionTypeId === '.servicenow') {
      const { title, comments, comment, description, severity, urgency, impact } = action.params
        .subActionParams as {
        title: string;
        description?: string;
        severity?: string;
        urgency?: string;
        impact?: string;
        comment?: string;
        comments?: Array<{ commentId: string; comment: string }>;
      };
      return [
        ...acc,
        {
          ...action,
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                short_description: title,
                description,
                severity,
                urgency,
                impact,
              },
              comments: [
                ...(comments ?? []),
                ...(comment != null ? [{ commentId: '1', comment }] : []),
              ],
            },
          },
        },
      ] as RawAlertAction[];
    }

    if (action.actionTypeId === '.jira') {
      const { title, comments, description, issueType, priority, labels, parent } = action.params
        .subActionParams as {
        title: string;
        description: string;
        issueType: string;
        priority?: string;
        labels?: string[];
        parent?: string;
        comments?: unknown[];
      };
      return [
        ...acc,
        {
          ...action,
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                summary: title,
                description,
                issueType,
                priority,
                labels,
                parent,
              },
              comments,
            },
          },
        },
      ] as RawAlertAction[];
    }

    if (action.actionTypeId === '.resilient') {
      const { title, comments, description, incidentTypes, severityCode } = action.params
        .subActionParams as {
        title: string;
        description: string;
        incidentTypes?: number[];
        severityCode?: number;
        comments?: unknown[];
      };
      return [
        ...acc,
        {
          ...action,
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                name: title,
                description,
                incidentTypes,
                severityCode,
              },
              comments,
            },
          },
        },
      ] as RawAlertAction[];
    }

    return acc;
  }, [] as RawAlertAction[]);

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actions: newActions,
    },
  };
}

function pipeMigrations(...migrations: AlertMigration[]): AlertMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
