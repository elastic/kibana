/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/core-saved-objects-server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { RawRule, RawRuleAction } from '../../../types';
import { createEsoMigration, pipeMigrations } from '../utils';

const SUPPORT_INCIDENTS_ACTION_TYPES = ['.servicenow', '.jira', '.resilient'];
export const isAnyActionSupportIncidents = (doc: SavedObjectUnsanitizedDoc<RawRule>): boolean =>
  doc.attributes.actions.some((action) =>
    SUPPORT_INCIDENTS_ACTION_TYPES.includes(action.actionTypeId)
  );

function isEmptyObject(obj: {}) {
  for (const attr in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, attr)) {
      return false;
    }
  }
  return true;
}

function setAlertUpdatedAtDate(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const updatedAt = doc.updated_at || doc.attributes.createdAt;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      updatedAt,
    },
  };
}

function setNotifyWhen(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const notifyWhen = doc.attributes.throttle ? 'onThrottleInterval' : 'onActiveAlert';
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      notifyWhen,
    },
  };
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

export const getMigrations7110 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(setAlertUpdatedAtDate, setNotifyWhen)
  );

export const getMigrations7112 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isAnyActionSupportIncidents(doc),
    pipeMigrations(restructureConnectorsThatSupportIncident)
  );
