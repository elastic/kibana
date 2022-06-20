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
  CspRuleTemplateTypeV830,
  CspRuleTemplateTypeV840,
} from '../../../common/schemas/csp_rule_template';

function migrateCSPRuleMetadata(
  doc: SavedObjectUnsanitizedDoc<CspRuleTemplateTypeV830>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<CspRuleTemplateTypeV840> {
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
  '8.4.0': migrateCSPRuleMetadata,
};
