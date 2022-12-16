/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import type { PrebuiltRuleContent } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';

export const RULE_ASSET_COMPOSITE2_SO_TYPE = 'security-rule-composite2';

export type RuleAssetComposite2SavedObject = SavedObject<RuleAssetComposite2Attributes>;

export interface RuleAssetComposite2Attributes {
  rule_id: string;
  versions: RuleVersionInfo[];
  content: Record<string, PrebuiltRuleContent>;
}

export interface RuleVersionInfo {
  rule_content_version: string;
  stack_version_min: string;
  stack_version_max: string;
}

const ruleAssetComposite2Mappings: SavedObjectsType['mappings'] = {
  dynamic: 'strict',
  properties: {
    rule_id: {
      type: 'keyword',
    },
    versions: {
      type: 'nested',
      properties: {
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
    },
    content: {
      type: 'flattened',
    },
  },
};

export const ruleAssetComposite2Type: SavedObjectsType = {
  name: RULE_ASSET_COMPOSITE2_SO_TYPE,
  mappings: ruleAssetComposite2Mappings,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
};
