/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type {
  ElasticRule,
  OriginalRule,
  RuleMigration,
} from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { Integration } from '../../../../types';
import type { TranslateRuleValidationErrors } from './types';

export const translateRuleState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  original_rule: Annotation<OriginalRule>(),
  integrations: Annotation<Integration[]>({
    reducer: (current, value) => value ?? current,
    default: () => [],
  }),
  inline_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  semantic_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  elastic_rule: Annotation<ElasticRule>({
    reducer: (state, action) => ({ ...state, ...action }),
    default: () => ({} as ElasticRule),
  }),
  validation_errors: Annotation<TranslateRuleValidationErrors>({
    reducer: (current, value) => value ?? current,
    default: () => ({ iterations: 0 } as TranslateRuleValidationErrors),
  }),
  translation_result: Annotation<SiemMigrationRuleTranslationResult>({
    reducer: (current, value) => value ?? current,
    default: () => SiemMigrationRuleTranslationResult.UNTRANSLATABLE,
  }),
  comments: Annotation<RuleMigration['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
});
