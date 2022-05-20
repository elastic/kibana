/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
} from '../../../../../../../src/core/server';
import { IRuleActionsAttributesSavedObjectAttributes, RuleAlertAction } from './types';

export const ruleActionsSavedObjectMigration = {
  '7.11.2': (
    doc: SavedObjectUnsanitizedDoc<IRuleActionsAttributesSavedObjectAttributes>
  ): SavedObjectSanitizedDoc<IRuleActionsAttributesSavedObjectAttributes> => {
    const { actions } = doc.attributes;
    const newActions = actions.reduce((acc, action) => {
      if (action.params.subAction !== 'pushToService') {
        return [...acc, action];
      }

      if (action.action_type_id === '.servicenow') {
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
        ] as RuleAlertAction[];
      }

      if (action.action_type_id === '.jira') {
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
        ] as RuleAlertAction[];
      }

      if (action.action_type_id === '.resilient') {
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
        ] as RuleAlertAction[];
      }

      return acc;
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
