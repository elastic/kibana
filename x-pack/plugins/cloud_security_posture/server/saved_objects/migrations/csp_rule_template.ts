/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationContext,
} from '@kbn/core/server';
import {
  RuleTemplateSchemaV830,
  RuleTemplateSchemaV840,
} from '../../../common/schemas/csp_rule_template';

function migrateRuleMetadata(
  doc: SavedObjectUnsanitizedDoc<RuleTemplateSchemaV830>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<RuleTemplateSchemaV840> {
  const { enabled, muted, ...metadata } = doc.attributes;
  return {
    ...doc,
    attributes: {
      enabled,
      muted,
      metadata,
    },
  };
}

export const cspRuleTemplateMigrations: SavedObjectMigrationMap = {
  '8.4.0': migrateRuleMetadata,
};
