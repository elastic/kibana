/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NEW_CHAT = i18n.translate('xpack.elasticAssistantPlugin.server.newChat', {
  defaultMessage: 'New chat',
});
export const YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT = i18n.translate(
  'xpack.elasticAssistantPlugin.server.prompts.youAreAHelpfulExpertAssistant',
  {
    defaultMessage:
      'You are a security analyst and expert in resolving security incidents. Your role is to assist by answering questions about Elastic Security.',
  }
);

export const IF_YOU_DONT_KNOW_THE_ANSWER = i18n.translate(
  'xpack.elasticAssistantPlugin.server.prompts.ifYouDontKnowTheAnswer',
  {
    defaultMessage: 'Do not answer questions unrelated to Elastic Security.',
  }
);

export const DEFAULT_SYSTEM_PROMPT = `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}`;
