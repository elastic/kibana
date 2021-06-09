/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogMeta,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
  SavedObjectAttributes,
  SavedObjectAttribute,
} from '../../../../../src/core/server';
import { RawAlert, RawAlertAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

const SIEM_APP_ID = 'securitySolution';
const SIEM_SERVER_APP_ID = 'siem';
export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

interface AlertLogMeta extends LogMeta {
  migrations: { alertDocument: SavedObjectUnsanitizedDoc<RawAlert> };
}

type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
) => SavedObjectUnsanitizedDoc<RawAlert>;

const SUPPORT_INCIDENTS_ACTION_TYPES = ['.servicenow', '.jira', '.resilient'];

export const isAnyActionSupportIncidents = (doc: SavedObjectUnsanitizedDoc<RawAlert>): boolean =>
  doc.attributes.actions.some((action) =>
    SUPPORT_INCIDENTS_ACTION_TYPES.includes(action.actionTypeId)
  );

export const isSecuritySolutionRule = (doc: SavedObjectUnsanitizedDoc<RawAlert>): boolean =>
  doc.attributes.alertTypeId === 'siem.signals';

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

  const migrationSecurityRules713 = encryptedSavedObjects.createMigration<RawAlert, RawAlert>(
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isSecuritySolutionRule(doc),
    pipeMigrations(removeNullsFromSecurityRules)
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationWhenRBACWasIntroduced, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationAlertUpdatedAtAndNotifyWhen, '7.11.0'),
    '7.11.2': executeMigrationWithErrorHandling(migrationActions7112, '7.11.2'),
    '7.13.0': executeMigrationWithErrorHandling(migrationSecurityRules713, '7.13.0'),
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
      context.log.error<AlertLogMeta>(
        `encryptedSavedObject ${version} migration failed for alert ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            alertDocument: doc,
          },
        }
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

function isEmptyObject(obj: {}) {
  for (const attr in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) {
      return false;
    }
  }
  return true;
}

function restructureConnectorsThatSupportIncident(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const { actions } = doc.attributes;
  const newActions = actions.reduce((acc, action) => {
    if (
      ['.servicenow', '.jira', '.resilient'].includes(action.actionTypeId) &&
      action.params.subAction === 'pushToService'
    ) {
      // Future developer, we needed to do that because when we created this migration
      // we forget to think about user already using 7.11.0 and having an incident attribute build the right way
      // IMPORTANT -> if you change this code please do the same inside of this file
      // x-pack/plugins/alerting/server/saved_objects/migrations.ts
      const subActionParamsIncident =
        (action.params?.subActionParams as SavedObjectAttributes)?.incident ?? null;
      if (subActionParamsIncident != null && !isEmptyObject(subActionParamsIncident)) {
        return [...acc, action];
      }
      if (action.actionTypeId === '.servicenow') {
        const {
          title,
          comments,
          comment,
          description,
          severity,
          urgency,
          impact,
          short_description: shortDescription,
        } = action.params.subActionParams as {
          title: string;
          description?: string;
          severity?: string;
          urgency?: string;
          impact?: string;
          comment?: string;
          comments?: Array<{ commentId: string; comment: string }>;
          short_description?: string;
        };
        return [
          ...acc,
          {
            ...action,
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  short_description: shortDescription ?? title,
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
      } else if (action.actionTypeId === '.jira') {
        const {
          title,
          comments,
          description,
          issueType,
          priority,
          labels,
          parent,
          summary,
        } = action.params.subActionParams as {
          title: string;
          description: string;
          issueType: string;
          priority?: string;
          labels?: string[];
          parent?: string;
          comments?: unknown[];
          summary?: string;
        };
        return [
          ...acc,
          {
            ...action,
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  summary: summary ?? title,
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
      } else if (action.actionTypeId === '.resilient') {
        const { title, comments, description, incidentTypes, severityCode, name } = action.params
          .subActionParams as {
          title: string;
          description: string;
          incidentTypes?: number[];
          severityCode?: number;
          comments?: unknown[];
          name?: string;
        };
        return [
          ...acc,
          {
            ...action,
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  name: name ?? title,
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
    }

    return [...acc, action];
  }, [] as RawAlertAction[]);

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actions: newActions,
    },
  };
}

function convertNullToUndefined(attribute: SavedObjectAttribute) {
  return attribute != null ? attribute : undefined;
}

function removeNullsFromSecurityRules(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const {
    attributes: { params },
  } = doc;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      params: {
        ...params,
        buildingBlockType: convertNullToUndefined(params.buildingBlockType),
        note: convertNullToUndefined(params.note),
        index: convertNullToUndefined(params.index),
        language: convertNullToUndefined(params.language),
        license: convertNullToUndefined(params.license),
        outputIndex: convertNullToUndefined(params.outputIndex),
        savedId: convertNullToUndefined(params.savedId),
        timelineId: convertNullToUndefined(params.timelineId),
        timelineTitle: convertNullToUndefined(params.timelineTitle),
        meta: convertNullToUndefined(params.meta),
        query: convertNullToUndefined(params.query),
        filters: convertNullToUndefined(params.filters),
        riskScoreMapping: params.riskScoreMapping != null ? params.riskScoreMapping : [],
        ruleNameOverride: convertNullToUndefined(params.ruleNameOverride),
        severityMapping: params.severityMapping != null ? params.severityMapping : [],
        threat: params.threat != null ? params.threat : [],
        threshold:
          params.threshold != null &&
          typeof params.threshold === 'object' &&
          !Array.isArray(params.threshold)
            ? {
                field: Array.isArray(params.threshold.field)
                  ? params.threshold.field
                  : params.threshold.field === '' || params.threshold.field == null
                  ? []
                  : [params.threshold.field],
                value: params.threshold.value,
                cardinality:
                  params.threshold.cardinality != null ? params.threshold.cardinality : [],
              }
            : undefined,
        timestampOverride: convertNullToUndefined(params.timestampOverride),
        exceptionsList:
          params.exceptionsList != null
            ? params.exceptionsList
            : params.exceptions_list != null
            ? params.exceptions_list
            : params.lists != null
            ? params.lists
            : [],
        threatFilters: convertNullToUndefined(params.threatFilters),
        machineLearningJobId:
          params.machineLearningJobId == null
            ? undefined
            : Array.isArray(params.machineLearningJobId)
            ? params.machineLearningJobId
            : [params.machineLearningJobId],
      },
    },
  };
}

function pipeMigrations(...migrations: AlertMigration[]): AlertMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
