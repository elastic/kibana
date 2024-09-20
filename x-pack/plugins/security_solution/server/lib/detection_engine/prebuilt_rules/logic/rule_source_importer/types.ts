/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSource,
  ValidatedRuleToImport,
} from '../../../../../../common/api/detection_engine';
import type { RuleFromImportStream } from '../../../rule_management/logic/import/utils';

export interface RuleSpecifier {
  rule_id: string;
  version: number | undefined;
}

export interface CalculatedRuleSource {
  ruleSource: RuleSource;
  immutable: boolean;
}

export interface IRuleSourceImporter {
  setup: ({ rules }: { rules: RuleFromImportStream[] }) => Promise<void>;
  isPrebuiltRule: (rule: RuleFromImportStream) => boolean;
  calculateRuleSource: (rule: ValidatedRuleToImport) => CalculatedRuleSource;
}
