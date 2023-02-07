/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { extractedSavedObjectParamReferenceNamePrefix } from '../../../rules_client/common/constants';
import {
  createEsoMigration,
  isEsQueryRuleType,
  isLogThresholdRuleType,
  pipeMigrations,
} from '../utils';
import { RawRule, RuleLastRunOutcomeOrderMap } from '../../../types';

function addGroupByToEsQueryRule(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  // Adding another check in for isEsQueryRuleType in case we add more migrations
  if (isEsQueryRuleType(doc)) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        params: {
          ...doc.attributes.params,
          aggType: 'count',
          groupBy: 'all',
        },
      },
    };
  }

  return doc;
}

function addActionUuid(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { actions },
  } = doc;

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      actions: actions
        ? actions.map((action) => ({
            ...action,
            uuid: uuidv4(),
          }))
        : [],
    },
  };
}

function addLogViewRefToLogThresholdRule(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (isLogThresholdRuleType(doc)) {
    const references = doc.references ?? [];
    const logViewId = 'log-view-reference-0';

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        params: {
          ...doc.attributes.params,
          logView: {
            logViewId,
            type: 'log-view-reference',
          },
        },
      },
      references: [
        ...references,
        {
          name: `${extractedSavedObjectParamReferenceNamePrefix}${logViewId}`,
          type: 'infrastructure-monitoring-log-view',
          id: 'default',
        },
      ],
    };
  }

  return doc;
}

function addOutcomeOrder(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (!doc.attributes.lastRun) {
    return doc;
  }

  const outcome = doc.attributes.lastRun.outcome;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      lastRun: {
        ...doc.attributes.lastRun,
        outcomeOrder: RuleLastRunOutcomeOrderMap[outcome],
      },
    },
  };
}

export const getMigrations870 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(
      addGroupByToEsQueryRule,
      addLogViewRefToLogThresholdRule,
      addOutcomeOrder,
      addActionUuid
    )
  );
