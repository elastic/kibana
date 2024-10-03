/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../../../detection_engine/prebuilt_rules';

export interface PrebuiltRuleMapped {
  isInstalled: boolean;
  rule: PrebuiltRuleAsset;
}

export type PrebuiltRulesMapByName = Map<string, PrebuiltRuleMapped>;
