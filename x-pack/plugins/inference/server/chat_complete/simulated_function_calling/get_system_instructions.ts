/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOOL_USE_END, TOOL_USE_START } from './constants';
import { ToolDefinition } from '../../../common/chat_complete/tools';

export function getSystemMessageInstructions({
  tools,
}: {
  tools?: Record<string, ToolDefinition>;
}) {
  const formattedTools = Object.entries(tools ?? {}).map(([name, tool]) => {
    return {
      name,
      ...tool,
    };
  });

  if (formattedTools.length) {
    return `In this environment, you have access to a set of tools you can use to answer the user's question.

    DO NOT call a tool when it is not listed.
    ONLY define input that is defined in the tool properties.
    If a tool does not have properties, leave them out.

    It is EXTREMELY important that you generate valid JSON between the \`\`\`json and \`\`\` delimiters.

    You may call them like this.

    Given the following tool:

    ${JSON.stringify({
      name: 'my_tool',
      description: 'A tool to call',
      schema: {
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

    Given the following tool:
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
      formattedTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        ...(tool.schema ? { schema: tool.schema } : {}),
      }))
    )}

    `;
  }

  return `No tools are available anymore. DO NOT UNDER ANY CIRCUMSTANCES call any tool, regardless of whether it was previously called.`;
}
