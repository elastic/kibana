/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.youAreAHelpfulExpertAssistant',
  {
    defaultMessage:
      'You are a helpful, expert assistant who answers questions about Elastic Security.',
  }
);

export const IF_YOU_DONT_KNOW_THE_ANSWER = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.ifYouDontKnowTheAnswer',
  {
    defaultMessage: 'Do not answer questions unrelated to Elastic Security.',
  }
);

export const SUPERHERO_PERSONALITY = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.superheroPersonality',
  {
    defaultMessage:
      'Provide the most detailed and relevant answer possible, as if you were relaying this information back to a cyber security expert.',
  }
);

export const FORMAT_OUTPUT_CORRECTLY = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.outputFormatting',
  {
    defaultMessage:
      'If you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.',
  }
);

export const DEFAULT_SYSTEM_PROMPT_NON_I18N = `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${FORMAT_OUTPUT_CORRECTLY}`;

export const DEFAULT_SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.defaultSystemPromptName',
  {
    defaultMessage: 'Default system prompt',
  }
);

export const SUPERHERO_SYSTEM_PROMPT_NON_I18N = `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${SUPERHERO_PERSONALITY}
${FORMAT_OUTPUT_CORRECTLY}`;

export const SUPERHERO_SYSTEM_PROMPT_NAME = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.system.superheroSystemPromptName',
  {
    defaultMessage: 'Enhanced system prompt',
  }
);
