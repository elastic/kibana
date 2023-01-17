/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  createEsoMigration,
  isEsQueryRuleType,
  isLogThresholdRuleType,
  pipeMigrations,
} from '../utils';
import { RawRule } from '../../../types';

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

function addLogViewToLogThresholdRule(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  if (isLogThresholdRuleType(doc)) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        params: {
          ...doc.attributes.params,
          logView: {
            logViewId: 'log-view-reference-0',
            type: 'log-view-reference',
          },
        },
      },
    };
  }

  return doc;
}

export const getMigrations870 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addGroupByToEsQueryRule, addLogViewToLogThresholdRule)
  );
