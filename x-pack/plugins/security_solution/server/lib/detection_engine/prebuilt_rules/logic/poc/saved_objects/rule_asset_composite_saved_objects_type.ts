/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsType } from '@kbn/core/server';

export const RULE_ASSET_COMPOSITE_SO_TYPE = 'security-rule-composite';

export type RuleAssetCompositeSavedObject = SavedObject<RuleAssetCompositeAttributes>;

export interface RuleAssetCompositeAttributes {
  rule_id: string;
  versions: IHistoricalRuleVersion[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IHistoricalRuleVersion extends Record<string, any> {
  name: string;
  rule_version: string;
  stack_version_min: string;
  stack_version_max: string;
}

const ruleAssetCompositeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    rule_id: {
      type: 'keyword',
    },
    versions: {
      type: 'nested',
      properties: {
        name: {
          type: 'keyword',
        },
        rule_version: {
          type: 'version',
        },
        stack_version_min: {
          type: 'version',
        },
        stack_version_max: {
          type: 'version',
        },
      },
    },
  },
};

export const ruleAssetCompositeType: SavedObjectsType = {
  name: RULE_ASSET_COMPOSITE_SO_TYPE,
  mappings: ruleAssetCompositeMappings,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
};
