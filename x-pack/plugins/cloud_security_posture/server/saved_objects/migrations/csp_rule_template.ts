/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesV1, rulesV2, rulesV3 } from '@kbn/cloud-security-posture-plugin/common/types/';
import {
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationContext,
} from '@kbn/core/server';

function migrateCspRuleTemplatesToV840(
  doc: SavedObjectUnsanitizedDoc<rulesV1.CspRuleTemplate>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<rulesV2.CspRuleTemplate> {
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
  doc: SavedObjectUnsanitizedDoc<rulesV2.CspRuleTemplate>,
  context: SavedObjectMigrationContext
): SavedObjectUnsanitizedDoc<rulesV3.CspRuleTemplate> {
  // Keeps only metadata, deprecated state
  const { muted, enabled, ...attributes } = doc.attributes;

  return {
    ...doc,
    attributes: {
      metadata: {
        ...attributes.metadata,
        benchmark: {
          ...attributes.metadata.benchmark,
          // CSPM introduced in 8.7, so we can assume all docs from 8.4.0 are KSPM
          posture_type: 'kspm',
        },
      },
    },
  };
}

export const cspRuleTemplateMigrations: SavedObjectMigrationMap = {
  '8.4.0': migrateCspRuleTemplatesToV840,
  '8.7.0': migrateCspRuleTemplatesToV870,
};
