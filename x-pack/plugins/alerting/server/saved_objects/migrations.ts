/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash/fp';
import {
  LogMeta,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
  SavedObjectAttributes,
  SavedObjectAttribute,
  SavedObjectReference,
} from '../../../../../src/core/server';
import { RawAlert, RawAlertAction } from '../types';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import type { IsMigrationNeededPredicate } from '../../../encrypted_saved_objects/server';

const SIEM_APP_ID = 'securitySolution';
const SIEM_SERVER_APP_ID = 'siem';
export const LEGACY_LAST_MODIFIED_VERSION = 'pre-7.10.0';

interface AlertLogMeta extends LogMeta {
  migrations: { alertDocument: SavedObjectUnsanitizedDoc<RawAlert> };
}

type AlertMigration = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
) => SavedObjectUnsanitizedDoc<RawAlert>;

function createEsoMigration(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isMigrationNeededPredicate: IsMigrationNeededPredicate<RawAlert, RawAlert>,
  migrationFunc: AlertMigration
) {
  return encryptedSavedObjects.createMigration<RawAlert, RawAlert>({
    isMigrationNeededPredicate,
    migration: migrationFunc,
    shouldMigrateIfDecryptionFails: true, // shouldMigrateIfDecryptionFails flag that applies the migration to undecrypted document if decryption fails
  });
}

const SUPPORT_INCIDENTS_ACTION_TYPES = ['.servicenow', '.jira', '.resilient'];

export const isAnyActionSupportIncidents = (doc: SavedObjectUnsanitizedDoc<RawAlert>): boolean =>
  doc.attributes.actions.some((action) =>
    SUPPORT_INCIDENTS_ACTION_TYPES.includes(action.actionTypeId)
  );

export const isSecuritySolutionRule = (doc: SavedObjectUnsanitizedDoc<RawAlert>): boolean =>
  doc.attributes.alertTypeId === 'siem.signals';

/**
 * Returns true if the alert type is that of "siem.notifications" which is a legacy notification system that was deprecated in 7.16.0
 * in favor of using the newer alerting notifications system.
 * @param doc The saved object alert type document
 * @returns true if this is a legacy "siem.notifications" rule, otherwise false
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const isSecuritySolutionLegacyNotification = (
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): boolean => doc.attributes.alertTypeId === 'siem.notifications';

export function getMigrations(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isPreconfigured: (connectorId: string) => boolean
): SavedObjectMigrationMap {
  const migrationWhenRBACWasIntroduced = createEsoMigration(
    encryptedSavedObjects,
    // migrate all documents in 7.10 in order to add the "meta" RBAC field
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    pipeMigrations(
      markAsLegacyAndChangeConsumer,
      setAlertIdAsDefaultDedupkeyOnPagerDutyActions,
      initializeExecutionStatus
    )
  );

  const migrationAlertUpdatedAtAndNotifyWhen = createEsoMigration(
    encryptedSavedObjects,
    // migrate all documents in 7.11 in order to add the "updatedAt" and "notifyWhen" fields
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    pipeMigrations(setAlertUpdatedAtDate, setNotifyWhen)
  );

  const migrationActions7112 = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isAnyActionSupportIncidents(doc),
    pipeMigrations(restructureConnectorsThatSupportIncident)
  );

  const migrationSecurityRules713 = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isSecuritySolutionRule(doc),
    pipeMigrations(removeNullsFromSecurityRules)
  );

  const migrationSecurityRules714 = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isSecuritySolutionRule(doc),
    pipeMigrations(removeNullAuthorFromSecurityRules)
  );

  const migrationSecurityRules715 = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => isSecuritySolutionRule(doc),
    pipeMigrations(addExceptionListsToReferences)
  );

  const migrateRules716 = createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    pipeMigrations(
      setLegacyId,
      getRemovePreconfiguredConnectorsFromReferencesFn(isPreconfigured),
      addRuleIdsToLegacyNotificationReferences
    )
  );

  const migrationRules800 = createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawAlert>): doc is SavedObjectUnsanitizedDoc<RawAlert> => true,
    (doc) => doc // no-op
  );

  return {
    '7.10.0': executeMigrationWithErrorHandling(migrationWhenRBACWasIntroduced, '7.10.0'),
    '7.11.0': executeMigrationWithErrorHandling(migrationAlertUpdatedAtAndNotifyWhen, '7.11.0'),
    '7.11.2': executeMigrationWithErrorHandling(migrationActions7112, '7.11.2'),
    '7.13.0': executeMigrationWithErrorHandling(migrationSecurityRules713, '7.13.0'),
    '7.14.1': executeMigrationWithErrorHandling(migrationSecurityRules714, '7.14.1'),
    '7.15.0': executeMigrationWithErrorHandling(migrationSecurityRules715, '7.15.0'),
    '7.16.0': executeMigrationWithErrorHandling(migrateRules716, '7.16.0'),
    '8.0.0': executeMigrationWithErrorHandling(migrationRules800, '8.0.0'),
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
      throw ex;
    }
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
        const { title, comments, description, issueType, priority, labels, parent, summary } =
          action.params.subActionParams as {
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

/**
 * The author field was introduced later and was not part of the original rules. We overlooked
 * the filling in the author field as an empty array in an earlier upgrade routine from
 * 'removeNullsFromSecurityRules' during the 7.13.0 upgrade. Since we don't change earlier migrations,
 * but rather only move forward with the "arrow of time" we are going to upgrade and fix
 * it if it is missing for anyone in 7.14.0 and above release. Earlier releases if we want to fix them,
 * would have to be modified as a "7.13.1", etc... if we want to fix it there.
 * @param doc The document that is not migrated and contains a "null" or "undefined" author field
 * @returns The document with the author field fleshed in.
 */
function removeNullAuthorFromSecurityRules(
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
        author: params.author != null ? params.author : [],
      },
    },
  };
}

/**
 * This migrates exception list containers to saved object references on an upgrade.
 * We only migrate if we find these conditions:
 *   - exceptionLists are an array and not null, undefined, or malformed data.
 *   - The exceptionList item is an object and id is a string and not null, undefined, or malformed data
 *   - The existing references do not already have an exceptionItem reference already found within it.
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc...
 * @param doc The document that might have exceptionListItems to migrate
 * @returns The document migrated with saved object references
 */
function addExceptionListsToReferences(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const {
    attributes: {
      params: { exceptionsList },
    },
    references,
  } = doc;
  if (!Array.isArray(exceptionsList)) {
    // early return if we are not an array such as being undefined or null or malformed.
    return doc;
  } else {
    const exceptionsToTransform = removeMalformedExceptionsList(exceptionsList);
    const newReferences = exceptionsToTransform.flatMap<SavedObjectReference>(
      (exceptionItem, index) => {
        const existingReferenceFound = references?.find((reference) => {
          return (
            reference.id === exceptionItem.id &&
            ((reference.type === 'exception-list' && exceptionItem.namespace_type === 'single') ||
              (reference.type === 'exception-list-agnostic' &&
                exceptionItem.namespace_type === 'agnostic'))
          );
        });
        if (existingReferenceFound) {
          // skip if the reference already exists for some uncommon reason so we do not add an additional one.
          // This enables us to be idempotent and you can run this migration multiple times and get the same output.
          return [];
        } else {
          return [
            {
              name: `param:exceptionsList_${index}`,
              id: String(exceptionItem.id),
              type:
                exceptionItem.namespace_type === 'agnostic'
                  ? 'exception-list-agnostic'
                  : 'exception-list',
            },
          ];
        }
      }
    );
    if (references == null && newReferences.length === 0) {
      // Avoid adding an empty references array if the existing saved object never had one to begin with
      return doc;
    } else {
      return { ...doc, references: [...(references ?? []), ...newReferences] };
    }
  }
}

/**
 * This will do a flatMap reduce where we only return exceptionsLists and their items if:
 *   - exceptionLists are an array and not null, undefined, or malformed data.
 *   - The exceptionList item is an object and id is a string and not null, undefined, or malformed data
 *
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc...
 * @param exceptionsList The list of exceptions
 * @returns The exception lists if they are a valid enough shape
 */
function removeMalformedExceptionsList(
  exceptionsList: SavedObjectAttribute
): SavedObjectAttributes[] {
  if (!Array.isArray(exceptionsList)) {
    // early return if we are not an array such as being undefined or null or malformed.
    return [];
  } else {
    return exceptionsList.flatMap((exceptionItem) => {
      if (!(exceptionItem instanceof Object) || !isString(exceptionItem.id)) {
        // return early if we are not an object such as being undefined or null or malformed
        // or the exceptionItem.id is not a string from being malformed
        return [];
      } else {
        return [exceptionItem];
      }
    });
  }
}

/**
 * This migrates rule_id's within the legacy siem.notification to saved object references on an upgrade.
 * We only migrate if we find these conditions:
 *   - ruleAlertId is a string and not null, undefined, or malformed data.
 *   - The existing references do not already have a ruleAlertId found within it.
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc... so we are safer to check them as possibilities
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param doc The document that might have "ruleAlertId" to migrate into the references
 * @returns The document migrated with saved object references
 */
function addRuleIdsToLegacyNotificationReferences(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const {
    attributes: {
      params: { ruleAlertId },
    },
    references,
  } = doc;
  if (!isSecuritySolutionLegacyNotification(doc) || !isString(ruleAlertId)) {
    // early return if we are not a string or if we are not a security solution notification saved object.
    return doc;
  } else {
    const existingReferences = references ?? [];
    const existingReferenceFound = existingReferences.find((reference) => {
      return reference.id === ruleAlertId && reference.type === 'alert';
    });
    if (existingReferenceFound) {
      // skip this if the references already exists for some uncommon reason so we do not add an additional one.
      return doc;
    } else {
      const savedObjectReference: SavedObjectReference = {
        id: ruleAlertId,
        name: 'param:alert_0',
        type: 'alert',
      };
      const newReferences = [...existingReferences, savedObjectReference];
      return { ...doc, references: newReferences };
    }
  }
}

function setLegacyId(
  doc: SavedObjectUnsanitizedDoc<RawAlert>
): SavedObjectUnsanitizedDoc<RawAlert> {
  const { id } = doc;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      legacyId: id,
    },
  };
}

function getRemovePreconfiguredConnectorsFromReferencesFn(
  isPreconfigured: (connectorId: string) => boolean
) {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>) => {
    return removePreconfiguredConnectorsFromReferences(doc, isPreconfigured);
  };
}

function removePreconfiguredConnectorsFromReferences(
  doc: SavedObjectUnsanitizedDoc<RawAlert>,
  isPreconfigured: (connectorId: string) => boolean
): SavedObjectUnsanitizedDoc<RawAlert> {
  const {
    attributes: { actions },
    references,
  } = doc;

  // Look for connector references
  const connectorReferences = (references ?? []).filter((ref: SavedObjectReference) =>
    ref.name.startsWith('action_')
  );
  if (connectorReferences.length > 0) {
    const restReferences = (references ?? []).filter(
      (ref: SavedObjectReference) => !ref.name.startsWith('action_')
    );

    const updatedConnectorReferences: SavedObjectReference[] = [];
    const updatedActions: RawAlert['actions'] = [];

    // For each connector reference, check if connector is preconfigured
    // If yes, we need to remove from the references array and update
    // the corresponding action so it directly references the preconfigured connector id
    connectorReferences.forEach((connectorRef: SavedObjectReference) => {
      // Look for the corresponding entry in the actions array
      const correspondingAction = getCorrespondingAction(actions, connectorRef.name);
      if (correspondingAction) {
        if (isPreconfigured(connectorRef.id)) {
          updatedActions.push({
            ...correspondingAction,
            actionRef: `preconfigured:${connectorRef.id}`,
          });
        } else {
          updatedActions.push(correspondingAction);
          updatedConnectorReferences.push(connectorRef);
        }
      } else {
        // Couldn't find the matching action, leave as is
        updatedConnectorReferences.push(connectorRef);
      }
    });

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: [...updatedActions],
      },
      references: [...updatedConnectorReferences, ...restReferences],
    };
  }
  return doc;
}

function getCorrespondingAction(
  actions: SavedObjectAttribute,
  connectorRef: string
): RawAlertAction | null {
  if (!Array.isArray(actions)) {
    return null;
  } else {
    return actions.find(
      (action) => (action as RawAlertAction)?.actionRef === connectorRef
    ) as RawAlertAction;
  }
}

function pipeMigrations(...migrations: AlertMigration[]): AlertMigration {
  return (doc: SavedObjectUnsanitizedDoc<RawAlert>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}
