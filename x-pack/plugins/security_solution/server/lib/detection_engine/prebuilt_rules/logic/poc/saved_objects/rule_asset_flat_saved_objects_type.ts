/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsType } from '@kbn/core/server';

export const RULE_ASSET_FLAT_SO_TYPE = 'security-rule-flat';

export type RuleAssetFlatSavedObject = SavedObject<RuleAssetFlatAttributes>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RuleAssetFlatAttributes extends Record<string, any> {
  name: string;
  rule_id: string;
  rule_content_version: string;
  stack_version_min: string;
  stack_version_max: string;
}

const ruleAssetFlatMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    name: {
      type: 'keyword',
    },
    rule_id: {
      type: 'keyword',
    },
    rule_content_version: {
      type: 'version',
    },
    stack_version_min: {
      type: 'version',
    },
    stack_version_max: {
      type: 'version',
    },
  },
};

export const ruleAssetFlatType: SavedObjectsType = {
  name: RULE_ASSET_FLAT_SO_TYPE,
  mappings: ruleAssetFlatMappings,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
};
