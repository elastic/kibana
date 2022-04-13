/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash/fp';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../../../../../src/core/server';

// eslint-disable-next-line no-restricted-imports
import {
  LegacyIRuleActionsAttributesSavedObjectAttributes,
  LegacyRuleAlertAction,
  LegacyRuleAlertSavedObjectAction,
} from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import {
  legacyGetActionReference,
  legacyGetRuleReference,
  legacyTransformLegacyRuleAlertActionToReference,
} from './legacy_utils';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
function isEmptyObject(obj: {}) {
  for (const attr in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) {
      return false;
    }
  }
  return true;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyRuleActionsSavedObjectMigration = {
  '7.11.2': (
    doc: SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
  ): SavedObjectSanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes> => {
    const { actions } = doc.attributes;
    const newActions = actions.reduce((acc, action) => {
      if (
        ['.servicenow', '.jira', '.resilient'].includes(action.action_type_id) &&
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
        if (action.action_type_id === '.servicenow') {
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
          ] as LegacyRuleAlertSavedObjectAction[];
        } else if (action.action_type_id === '.jira') {
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
          ] as LegacyRuleAlertSavedObjectAction[];
        } else if (action.action_type_id === '.resilient') {
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
          ] as LegacyRuleAlertSavedObjectAction[];
        }
      }

      return [...acc, action];
    }, [] as LegacyRuleAlertSavedObjectAction[]);

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: newActions,
      },
      references: doc.references || [],
    };
  },
  '7.16.0': (
    doc: SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
  ): SavedObjectSanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes> => {
    return legacyMigrateRuleAlertId(doc);
  },
};

/**
 * This migrates rule_id's and actions within the legacy siem.notification to saved object references on an upgrade.
 * We only migrate rule_id if we find these conditions:
 *   - ruleAlertId is a string and not null, undefined, or malformed data.
 *   - The existing references do not already have a ruleAlertId found within it.
 * We only migrate the actions if we find these conditions:
 *   - The actions exists and is an array.
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc... so we are safer to check them as possibilities
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param doc The document that might have ruleId's to migrate into the references
 * @returns The document migrated with saved object references
 */
export const legacyMigrateRuleAlertId = (
  doc: SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
): SavedObjectSanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes> => {
  const {
    attributes: { actions },
    references,
  } = doc;
  // remove the ruleAlertId from the doc
  const { ruleAlertId, ...attributesWithoutRuleAlertId } = doc.attributes;
  const existingReferences = references ?? [];
  if (!isString(ruleAlertId) || !Array.isArray(actions)) {
    // early return if we are not a string or if we are not a security solution notification saved object.
    return { ...doc, references: existingReferences };
  } else {
    const alertReferences = legacyMigrateAlertId({
      ruleAlertId,
      existingReferences,
    });

    // we use flat map here to be "idempotent" and skip it if it has already been migrated for any particular reason
    const actionsReferences = actions.flatMap<SavedObjectReference>((action, index) => {
      if (
        existingReferences.find((reference) => {
          return (
            // we as cast it to the pre-7.16 version to get the old id from it
            (action as unknown as LegacyRuleAlertAction).id === reference.id &&
            reference.type === 'action'
          );
        })
      ) {
        return [];
      }
      return [
        // we as cast it to the pre-7.16 version to get the old id from it
        legacyGetActionReference((action as unknown as LegacyRuleAlertAction).id, index),
      ];
    });

    const actionsWithRef = actions.map((action, index) =>
      // we as cast it to the pre-7.16 version to pass it to get the actions with ref.
      legacyTransformLegacyRuleAlertActionToReference(
        action as unknown as LegacyRuleAlertAction,
        index
      )
    );
    return {
      ...doc,
      attributes: {
        ...attributesWithoutRuleAlertId,
        actions: actionsWithRef,
      },
      references: [...existingReferences, ...alertReferences, ...actionsReferences],
    };
  }
};

/**
 * This is a helper to migrate "ruleAlertId"
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @param existingReferences The existing saved object references
 * @param ruleAlertId The ruleAlertId to migrate
 * @returns The savedObjectReferences migrated
 */
export const legacyMigrateAlertId = ({
  existingReferences,
  ruleAlertId,
}: {
  existingReferences: SavedObjectReference[];
  ruleAlertId: string;
}): SavedObjectReference[] => {
  const existingReferenceFound = existingReferences.find((reference) => {
    return reference.id === ruleAlertId && reference.type === 'alert';
  });
  if (existingReferenceFound) {
    return [];
  } else {
    return [legacyGetRuleReference(ruleAlertId)];
  }
};
