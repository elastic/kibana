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
  CspRuleTemplateV830,
  CspRuleTemplateV840,
  CspRuleTemplateV870,
} from '../../../common/schemas/csp_rule_template';

function migrateCspRuleTemplatesToV840(
  doc: SavedObjectUnsanitizedDoc<CspRuleTemplateV830>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<CspRuleTemplateV840> {
  const { enabled, muted, benchmark, ...metadata } = doc.attributes;
  return {
    ...doc,
    attributes: {
      enabled,
      muted,
      metadata: {
        ...metadata,
        benchmark: { ...benchmark, id: 'cis_k8s' },
        impact: metadata.impact || undefined,
        default_value: metadata.default_value || undefined,
        references: metadata.references || undefined,
      },
    },
  };
}

function migrateCspRuleTemplatesToV870(
  doc: SavedObjectUnsanitizedDoc<CspRuleTemplateV840>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<CspRuleTemplateV870> {
  // Keeps only metadata, deprecated state
  const { muted, enabled, ...attributes } = doc.attributes;
  return {
    ...doc,
    attributes,
  };
}

export const cspRuleTemplateMigrations: SavedObjectMigrationMap = {
  '8.4.0': migrateCspRuleTemplatesToV840,
  '8.7.0': migrateCspRuleTemplatesToV870,
};
