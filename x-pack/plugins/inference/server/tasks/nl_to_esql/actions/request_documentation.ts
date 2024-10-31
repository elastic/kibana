/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { InferenceClient, withoutOutputUpdateEvents } from '../../..';
import { Message } from '../../../../common';
import { ToolChoiceType, ToolOptions } from '../../../../common/chat_complete/tools';
import { requestDocumentationSchema } from './shared';
import type { FunctionCallingMode } from '../../../../common/chat_complete';

export const requestDocumentation = ({
  outputApi,
  system,
  messages,
  connectorId,
  functionCalling,
  toolOptions: { tools, toolChoice },
}: {
  outputApi: InferenceClient['output'];
  system: string;
  messages: Message[];
  connectorId: string;
  functionCalling?: FunctionCallingMode;
  toolOptions: ToolOptions;
}) => {
  const hasTools = !isEmpty(tools) && toolChoice !== ToolChoiceType.none;

  return outputApi('request_documentation', {
    connectorId,
    functionCalling,
    system,
    previousMessages: messages,
    input: `Based on the previous conversation, request documentation
        from the ES|QL handbook to help you get the right information
        needed to generate a query.

        Examples for functions and commands:
        - Do you need to group data? Request \`STATS\`.
        - Extract data? Request \`DISSECT\` AND \`GROK\`.
        - Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

        ${
          hasTools
            ? `### Tools

        The following tools will be available to be called in the step after this.

        \`\`\`json
        ${JSON.stringify({
          tools,
          toolChoice,
        })}
        \`\`\``
            : ''
        }
      `,
    schema: requestDocumentationSchema,
  }).pipe(withoutOutputUpdateEvents());
};
