/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationContext,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { isSerializedSearchSource } from '@kbn/data-plugin/common';
import { pick } from 'lodash';
import { RawRule } from '../../../types';
import { createEsoMigration, isEsQueryRuleType, pipeMigrations } from '../utils';
import { AlertLogMeta } from '../types';

function stripOutRuntimeFieldsInOldESQuery(
  doc: SavedObjectUnsanitizedDoc<RawRule>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<RawRule> {
  const isESDSLrule =
    isEsQueryRuleType(doc) && !isSerializedSearchSource(doc.attributes.params.searchConfiguration);

  if (isESDSLrule) {
    try {
      const parsedQuery = JSON.parse(doc.attributes.params.esQuery as string);
      // parsing and restringifying will cause us to lose the formatting so we only do so if this rule has
      // fields other than `query` which is the only valid field at this stage
      const hasFieldsOtherThanQuery = Object.keys(parsedQuery).some((key) => key !== 'query');
      return hasFieldsOtherThanQuery
        ? {
            ...doc,
            attributes: {
              ...doc.attributes,
              params: {
                ...doc.attributes.params,
                esQuery: JSON.stringify(pick(parsedQuery, 'query'), null, 4),
              },
            },
          }
        : doc;
    } catch (err) {
      // Instead of failing the upgrade when an unparsable rule is encountered, we log that the rule caouldn't be migrated and
      // as a result legacy parameters might cause the rule to behave differently if it is, in fact, still running at all
      context.log.error<AlertLogMeta>(
        `unable to migrate and remove legacy runtime fields in rule ${doc.id} due to invalid query: "${doc.attributes.params.esQuery}" - query must be JSON`,
        {
          migrations: {
            alertDocument: doc,
          },
        }
      );
    }
  }
  return doc;
}

export const getMigrations850 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isEsQueryRuleType(doc),
    pipeMigrations(stripOutRuntimeFieldsInOldESQuery)
  );
