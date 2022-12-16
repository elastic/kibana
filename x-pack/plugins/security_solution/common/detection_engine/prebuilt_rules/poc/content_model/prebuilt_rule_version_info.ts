/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSignatureId } from '../../../rule_schema';
import type { SemanticVersion } from './semantic_version';

export interface PrebuiltRuleVersionInfo {
  rule_id: RuleSignatureId;
  rule_content_version: SemanticVersion;
  stack_version_min: SemanticVersion;
  stack_version_max: SemanticVersion;
}
