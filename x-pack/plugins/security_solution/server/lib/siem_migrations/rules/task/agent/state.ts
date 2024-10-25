/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type {
  ElasticRule,
  OriginalRule,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export const migrateRuleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  original_rule: Annotation<OriginalRule>(),
  elastic_rule: Annotation<ElasticRule>({
    reducer: (state, action) => ({ ...state, ...action }),
  }),
  translation_state: Annotation<string>(),
  prebuilt_rule_id: Annotation<string>(),
  response: Annotation<string>(),
});
