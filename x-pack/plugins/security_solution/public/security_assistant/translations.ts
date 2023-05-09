/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SECURITY_ASSISTANT_TITLE = i18n.translate(
  'xpack.securitySolution.securityAssistant.title',
  {
    defaultMessage: 'Elastic Security Assistant',
  }
);
export const PROMPT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.securityAssistant.promptPlaceholder',
  {
    defaultMessage:
      "Ask a question! You can ask anything from things like 'check this hash xxxx' or 'help me with a query I need to build'.",
  }
);

export const CHAT_COMPLETION_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.securityAssistant.chatCompletion.fetchFailureTitle',
  {
    defaultMessage: 'An error occurred fetching chat completion.',
  }
);
