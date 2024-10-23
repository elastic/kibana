/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';

export type RuleFromImportStream = RuleToImport | Error;

export const isRuleToImport = (rule: RuleFromImportStream): rule is RuleToImport =>
  !(rule instanceof Error);
