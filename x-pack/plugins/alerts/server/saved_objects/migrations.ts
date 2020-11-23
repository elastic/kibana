/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from '../../../../../src/core/server';
import { RawAlert } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import {
  APP_ID as SIEM_APP_ID,
  SERVER_APP_ID as SIEM_SERVER_APP_ID,
} from '../../../security_solution/common/constants';

export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
) => SavedObjectUnsanitizedDoc<RawAlert>;

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

  const migrationAlertUpdatedAtAndNotifyOnlyOnActionGroupChange = encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    // migrate all documents in 7.11 in order to add the "updatedAt" and "notifyOnlyOnActionGroupChange" fields
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    pipeMigrations(setAlertUpdatedAtDate, setNotifyOnlyOnActionGroupChange)
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationWhenRBACWasIntroduced, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationAlertUpdatedAtAndNotifyOnlyOnActionGroupChange, '7.11.0'),
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

const setNotifyOnlyOnActionGroupChange = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> => {
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      notifyOnlyOnActionGroupChange: false,
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

function pipeMigrations(...migrations: AlertMigration[]): AlertMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
