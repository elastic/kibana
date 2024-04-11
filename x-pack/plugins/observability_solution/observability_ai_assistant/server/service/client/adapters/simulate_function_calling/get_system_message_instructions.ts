/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionDefinition } from '../../../../../common';
import { TOOL_USE_END, TOOL_USE_START } from './constants';

export function getSystemMessageInstructions({
  functions,
}: {
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
}) {
  if (functions?.length) {
    return `In this environment, you have access to a set of tools you can use to answer the user's question.

    When deciding what tool to use, keep in mind that you can call other tools in successive requests, so decide what tool
    would be a good first step.

    You MUST only invoke a single tool, and invoke it once. Other invocations will be ignored.
    You MUST wait for the results before invoking another.
    You can call multiple tools in successive messages. This means you can chain tool calls. If any tool was used in a previous
    message, consider whether it still makes sense to follow it up with another tool call.

    ${
      functions?.find((fn) => fn.name === 'context')
        ? `The "context" tool is ALWAYS used after a user question. Even if it was used before, your job is to answer the last user question,
    even if the "context" tool was executed after that. Consider the tools you need to answer the user's question.`
        : ''
    }
    
    Rather than explaining how you would call a tool, just generate the JSON to call the tool. It will automatically be
    executed and returned to you.

    These results are generally not visible to the user. Treat them as if they are not,
    unless specified otherwise.
    
    You may call them like this.

    Given the following tool:

    {
      "name": "my_tool",
      "description: "A tool to call",
      "parameters": {
        "type": "object",
        "properties": {
          "myProperty": {
            "type": "string"
          }
        }
      }
    }

    Use it the following way:

    ${TOOL_USE_START}
    \`\`\`json
    {
      "name": "my_tool",
      "input": {
        "myProperty": "myValue"
      }
    }
    \`\`\`\
    ${TOOL_USE_END}

    Given the following tool:
    {
      "name": "my_tool_without_parameters",
      "description": "A tool to call without parameters",
    }

    Use it the following way: 
    ${TOOL_USE_START}
    \`\`\`json
    {
      "name": "my_tool_without_parameters"
    }
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

  return `No tools are available anymore. Ignore everything that was said about tools before. DO NOT UNDER ANY CIRCUMSTANCES call any tool, regardless of whether it was previously called.`;
}
