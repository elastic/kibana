/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { MessageRole } from '../../common';
import { ContextDefinition } from '../../common/types';

export function getAssistantSetupMessage({ contexts }: { contexts: ContextDefinition[] }) {
  return {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.System as const,
      content: [
        dedent(
          `You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.
          
          It's very important to not assume what the user is meaning. Ask them for clarification if needed.
          
          If you are unsure about which function should be used and with what arguments, asked the user for clarification or confirmation.
          
          You can use (Github-flavored) Markdown in your responses. Use it to nicely format output, like a table.`
        ),
      ]
        .concat(contexts.map((context) => context.description))
        .join('\n'),
    },
  };
}
