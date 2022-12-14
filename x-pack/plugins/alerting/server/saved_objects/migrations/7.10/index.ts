/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { RawRule, RawRuleExecutionStatus } from '../../../types';
import { LEGACY_LAST_MODIFIED_VERSION, SIEM_APP_ID, SIEM_SERVER_APP_ID } from '../constants';
import { createEsoMigration, pipeMigrations } from '../utils';

const consumersToChange: Map<string, string> = new Map(
  Object.entries({
    alerting: 'alerts',
    metrics: 'infrastructure',
    [SIEM_APP_ID]: SIEM_SERVER_APP_ID,
  })
);

function markAsLegacyAndChangeConsumer(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
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
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
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
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const { attributes } = doc;
  return {
    ...doc,
    attributes: {
      ...attributes,
      executionStatus: {
        status: 'pending',
        lastExecutionDate: new Date().toISOString(),
        error: null,
      } as RawRuleExecutionStatus,
    },
  };
}

export const getMigrations7100 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    // migrate all documents in 7.10 in order to add the "meta" RBAC field
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(
      markAsLegacyAndChangeConsumer,
      setAlertIdAsDefaultDedupkeyOnPagerDutyActions,
      initializeExecutionStatus
    )
  );
