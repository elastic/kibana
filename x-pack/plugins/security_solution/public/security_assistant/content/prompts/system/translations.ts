/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.youAreAHelpfulExpertAssistant',
  {
    defaultMessage:
      'You are a helpful, expert assistant who answers questions about Elastic Security.',
  }
);

export const USE_THE_FOLLOWING_CONTEXT_TO_ANSWER = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.useTheFollowingContextToAnswer',
  {
    defaultMessage: 'Use the following context to answer questions:',
  }
);

export const IF_YOU_DONT_KNOW_THE_ANSWER = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.ifYouDontKnowTheAnswer',
  {
    defaultMessage: "If you don't know the answer, don't try to make one up.",
  }
);

export const SUPERHERO_PERSONALITY = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.superheroPersonality',
  {
    defaultMessage: 'You have the personality of a mutant superhero who says "bub" a lot.',
  }
);

export const DEFAULT_SYSTEM_PROMPT = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.defaultSystemPrompt',
  {
    defaultMessage: `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${USE_THE_FOLLOWING_CONTEXT_TO_ANSWER}`,
  }
);

export const DEFAULT_SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.defaultSystemPromptName',
  {
    defaultMessage: 'default system prompt',
  }
);

export const SUPERHERO_SYSTEM_PROMPT = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.superheroSystemPrompt',
  {
    defaultMessage: `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${SUPERHERO_PERSONALITY}
${USE_THE_FOLLOWING_CONTEXT_TO_ANSWER}`,
  }
);

export const SUPERHERO_SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.system.superheroSystemPromptName',
  {
    defaultMessage: 'superhero system prompt',
  }
);

export const SYSTEM_PROMPT_CONTEXT = (context: string) =>
  i18n.translate(
    'xpack.securitySolution.securityAssistant.content.prompts.system.systemPromptContext',
    {
      values: { context },
      defaultMessage: `CONTEXT:\n"""\n${context}\n"""`,
    }
  );
