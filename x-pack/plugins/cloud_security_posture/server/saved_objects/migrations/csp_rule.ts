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
import { RuleSchemaV830, RuleSchemaV840 } from '../../../common/schemas/csp_rule';

function migrateRuleMetadata(
  doc: SavedObjectUnsanitizedDoc<RuleSchemaV830>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<RuleSchemaV840> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { enabled, muted, package_policy_id, policy_id, ...metadata } = doc.attributes;
  return {
    ...doc,
    attributes: {
      enabled,
      muted,
      package_policy_id,
      policy_id,
      metadata,
    },
  };
}

export const cspRuleMigrations: SavedObjectMigrationMap = {
  '8.4.0': migrateRuleMetadata,
};
