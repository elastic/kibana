/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_FUNCTION_NAME } from '../../../../functions/context';
import { FunctionDefinition } from '../../../../../common';
import { TOOL_USE_END, TOOL_USE_START } from './constants';

export function getSystemMessageInstructions({
  functions,
}: {
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
}) {
  if (functions?.length) {
    return `In this environment, you have access to a set of tools you can use to answer the user's question.

    ${
      functions?.find((fn) => fn.name === CONTEXT_FUNCTION_NAME)
        ? `The "context" tool is ALWAYS used after a user question. Even if it was used before, your job is to answer the last user question,
    even if the "context" tool was executed after that. Consider the tools you need to answer the user's question.`
        : ''
    }

    DO NOT call a tool when it is not listed.
    ONLY define input that is defined in the tool properties.
    If a tool does not have properties, leave them out.

    It is EXTREMELY important that you generate valid JSON between the \`\`\`json and \`\`\` delimiters.

    IMPORTANT: make sure you start and end a tool call with the ${TOOL_USE_START} and ${TOOL_USE_END} markers, it MUST
    be included in the tool call.

    You may call tools like this:

    ${TOOL_USE_START}
    \`\`\`json
    ${JSON.stringify({ name: '[name of the tool]', input: { myProperty: 'myValue' } })}
    \`\`\`\
    ${TOOL_USE_END}

    For example, given the following tool:

    ${JSON.stringify({
      name: 'my_tool',
      description: 'A tool to call',
      parameters: {
        type: 'object',
        properties: {
          myProperty: {
            type: 'string',
          },
        },
      },
    })}

    Use it the following way:

    ${TOOL_USE_START}
    \`\`\`json
    ${JSON.stringify({ name: 'my_tool', input: { myProperty: 'myValue' } })}
    \`\`\`\
    ${TOOL_USE_END}

    Another example: given the following tool:

    ${JSON.stringify({
      name: 'my_tool_without_parameters',
      description: 'A tool to call without parameters',
    })}

    Use it the following way:

    ${TOOL_USE_START}
    \`\`\`json
    ${JSON.stringify({ name: 'my_tool_without_parameters', input: {} })}
    \`\`\`\
    ${TOOL_USE_END}

    Here are the tools available:

    ${JSON.stringify(
      functions.map((fn) => ({
        name: fn.name,
        description: fn.description,
        ...(fn.parameters ? { parameters: fn.parameters } : {}),
      }))
    )}

    `;
  }

  return `No tools are available anymore. DO NOT UNDER ANY CIRCUMSTANCES call any tool, regardless of whether it was previously called.`;
}
