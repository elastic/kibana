/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { PrebuiltRuleMapped, PrebuiltRulesMapByName } from '../types';

export const matchPrebuiltRuleState = Annotation.Root({
  splunkRuleTitle: Annotation<string>(),
  splunkRuleDescription: Annotation<string>,
  prebuiltRulesMap: Annotation<PrebuiltRulesMapByName>,
  response: Annotation<string>,
  matched: Annotation<boolean>,
  result: Annotation<PrebuiltRuleMapped>,
});
