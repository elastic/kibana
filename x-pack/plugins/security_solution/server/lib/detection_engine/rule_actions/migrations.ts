/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAlertAction } from '../../../../common/detection_engine/types';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectAttributes,
} from '../../../../../../../src/core/server';
import { IRuleActionsAttributesSavedObjectAttributes } from './types';

/**
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations
 * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
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
 * We keep this around to migrate and update data for the old deprecated rule actions saved object mapping but we
 * do not use it anymore within the code base. Once we feel comfortable that users are upgrade far enough and this is no longer
 * needed then it will be safe to remove this saved object and all its migrations
 * @deprecated Remove this once we no longer need legacy migrations for rule actions (8.0.0)
 */
export const ruleActionsSavedObjectMigration = {
  '7.11.2': (
    doc: SavedObjectUnsanitizedDoc<IRuleActionsAttributesSavedObjectAttributes>
  ): SavedObjectSanitizedDoc<IRuleActionsAttributesSavedObjectAttributes> => {
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
          ] as RuleAlertAction[];
        } else if (action.action_type_id === '.jira') {
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
          ] as RuleAlertAction[];
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
          ] as RuleAlertAction[];
        }
      }

      return [...acc, action];
    }, [] as RuleAlertAction[]);

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        actions: newActions,
      },
      references: doc.references || [],
    };
  },
};
