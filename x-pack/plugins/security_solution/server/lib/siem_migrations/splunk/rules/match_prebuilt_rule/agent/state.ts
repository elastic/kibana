/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { PrebuiltRuleMapped, PrebuiltRulesMapByName } from '../types';

export const matchPrebuiltRuleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  splunkRuleTitle: Annotation<string>(),
  splunkRuleDescription: Annotation<string>,
  matched: Annotation<boolean>,
  response: Annotation<string>,
  rule: Annotation<PrebuiltRuleMapped>,
  prebuiltRulesMap: Annotation<PrebuiltRulesMapByName>,
});
