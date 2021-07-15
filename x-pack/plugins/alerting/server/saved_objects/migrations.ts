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
const SUPPORT_INCIDENTS_ACTION_TYPES = ['.servicenow', '.jira', '.resilient'];
export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

// Remove this when we finish updating terminology in the code
type RawRule = RawAlert;
type RawRuleAction = RawAlertAction;

interface RuleLogMeta extends LogMeta {
  migrations: { ruleDocument: SavedObjectUnsanitizedDoc<RawRule> };
}

type RuleMigration = (
  doc: SavedObjectUnsanitizedDoc<RawRule>
) => SavedObjectUnsanitizedDoc<RawRule>;

type IsMigrationNeededPredicate<InputAttributes> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes>
) => doc is SavedObjectUnsanitizedDoc<InputAttributes>;

interface RuleMigrationFns<InputAttributes, MigratedAttributes> {
  esoMigrationFn: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
  fallbackMigrationFn: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
}

export const isAnyActionSupportIncidents = (doc: SavedObjectUnsanitizedDoc<RawRule>): boolean =>
  doc.attributes.actions.some((action) =>
    SUPPORT_INCIDENTS_ACTION_TYPES.includes(action.actionTypeId)
  );

export const isSecuritySolutionRule = (doc: SavedObjectUnsanitizedDoc<RawRule>): boolean =>
  doc.attributes.alertTypeId === 'siem.signals';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): SavedObjectMigrationMap {
  const migrationWhenRBACWasIntroduced = createMigrationFns(
    encryptedSavedObjects,
    // migrate all documents in 7.10 in order to add the "meta" RBAC field
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(
      markAsLegacyAndChangeConsumer,
      setAlertIdAsDefaultDedupkeyOnPagerDutyActions,
      initializeExecutionStatus
    )
  );

  const migrationAlertUpdatedAtAndNotifyWhen = createMigrationFns(
    encryptedSavedObjects,
    // migrate all documents in 7.11 in order to add the "updatedAt" and "notifyWhen" fields
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(setAlertUpdatedAtDate, setNotifyWhen)
  );

  const migrationActions7112 = createMigrationFns(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isAnyActionSupportIncidents(doc),
    pipeMigrations(restructureConnectorsThatSupportIncident)
  );

  const migrationSecurityRules713 = createMigrationFns(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isSecuritySolutionRule(doc),
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
  migrationFunctions: RuleMigrationFns<RawRule, RawRule>,
  version: string
) {
  return (doc: SavedObjectUnsanitizedDoc<RawRule>, context: SavedObjectMigrationContext) => {
    try {
      return migrationFunctions.esoMigrationFn(doc, context);
    } catch (ex) {
      context.log.error<RuleLogMeta>(
        `encryptedSavedObject ${version} migration failed for rule ${doc.id} with error: ${ex.message}`,
        {
          migrations: {
            ruleDocument: doc,
          },
        }
      );
    }
    return migrationFunctions.fallbackMigrationFn(doc, context);
  };
}

const setAlertUpdatedAtDate = (
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> => {
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
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> => {
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
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
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
        ] as RawRuleAction[];
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
        ] as RawRuleAction[];
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
        ] as RawRuleAction[];
      }
    }

    return [...acc, action];
  }, [] as RawRuleAction[]);

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
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
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

function pipeMigrations(...migrations: RuleMigration[]): RuleMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawRule>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}

function createMigrationFns(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<RawRule>,
  migrationFunc: RuleMigration
): RuleMigrationFns<RawRule, RawRule> {
  return {
    esoMigrationFn: encryptedSavedObjects.createMigration<RawRule, RawRule>(
      isMigrationNeededPredicate,
      migrationFunc
    ),
    fallbackMigrationFn: (doc: SavedObjectUnsanitizedDoc<RawRule>) => {
      if (!isMigrationNeededPredicate(doc)) {
        return doc;
      }

      return migrationFunc(doc);
    },
  };
}
