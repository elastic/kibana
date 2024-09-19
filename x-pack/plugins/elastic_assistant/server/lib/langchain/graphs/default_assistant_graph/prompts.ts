/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
} from './nodes/translations';

export const formatPrompt = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

const PROMPT_1 = `ALWAYS use the provided tools, as they have access to the latest data and syntax.

Always return value from ESQLKnowledgeBaseTool as is. Do not reflect on the quality of the returned search results in your response.`;
const PROMPT_2 = `${BEDROCK_SYSTEM_PROMPT}`;
const PROMPT_2_1 = `Use tools as often as possible, as they have access to the latest data and syntax. The result returned from ESQLKnowledgeBaseTool is a string which should not be modified and should ALWAYS be returned as is. Do not reflect on the quality of the returned search results in your response.`;
const PROMPT_3 = `${GEMINI_SYSTEM_PROMPT}`;
const PROMPT_4_0 = `Use tools as often as possible, as they have access to the latest data and syntax. Always return value from ESQLKnowledgeBaseTool as is. Do not reflect on the quality of the returned search results in your response. Final ES|QL query should always be wrapped in tripple backticks and be put on a new line.`;
const PROMPT_4_1 = `ALWAYS use the provided tools, as they have access to the latest data and syntax. ALWAYS pass the whole user input to ESQLKnowledgeBaseTool. ALWAYS return value from ESQLKnowledgeBaseTool as is.`;
const PROMPT_5 = `Use tools as often as possible, as they have access to the latest data and syntax. Always return value from ESQLKnowledgeBaseTool as is and use it as a final answer without modifying it. Do not reflect on the quality of the returned search results in your response.`;
const PROMPT_6 = `
Use tools as often as possible, as they have access to the latest data and syntax.

When using ESQLKnowledgeBaseTool pass the user's questions directly as input into the tool.

Always return value from ESQLKnowledgeBaseTool as is.

The ES|QL query should always be wrapped in triple backticks ("\`\`\`esql"). Add a new line character right before the triple backticks.

It is important that ES|QL query is preceeded by a new line.`;

// export const GEMINI_SYSTEM_PROMPT =
//   `ALWAYS use the provided tools, as they have access to the latest data and syntax.` +
//   "The final response is the only output the user sees and should be a complete answer to the user's question. Do not leave out important tool output. The final response should never be empty. Don't forget to use tools.";
// export const BEDROCK_SYSTEM_PROMPT = `Use tools as often as possible, as they have access to the latest data and syntax. Always return value from ESQLKnowledgeBaseTool as is. Never return <thinking> tags in the response, but make sure to include <result> tags content in the response. Do not reflect on the quality of the returned search results in your response.`;

export const systemPrompts = {
  openai: DEFAULT_SYSTEM_PROMPT,
  bedrock: `${DEFAULT_SYSTEM_PROMPT} ${BEDROCK_SYSTEM_PROMPT}`,
  gemini: `${DEFAULT_SYSTEM_PROMPT} ${GEMINI_SYSTEM_PROMPT}`,
  structuredChat: `${DEFAULT_SYSTEM_PROMPT}

Respond to the human as helpfully and accurately as possible. You have access to the following tools:

{tools}

The tool action_input should ALWAYS follow the tool JSON schema args.

Valid "action" values: "Final Answer" or {tool_names}

Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input strictly adhering to the tool JSON schema args).

Provide only ONE action per $JSON_BLOB, as shown:

\`\`\`

{{

  "action": $TOOL_NAME,

  "action_input": $TOOL_INPUT

}}

\`\`\`

Follow this format:

Question: input question to answer

Thought: consider previous and subsequent steps

Action:

\`\`\`

$JSON_BLOB

\`\`\`

Observation: action result

... (repeat Thought/Action/Observation N times)

Thought: I know what to respond

Action:

\`\`\`

{{

  "action": "Final Answer",

  "action_input": "Final response to human"}}

Begin! Reminder to ALWAYS respond with a valid json blob of a single action with no additional output. When using tools, ALWAYS input the expected JSON schema args. Your answer will be parsed as JSON, so never use double quotes within the output and instead use backticks. Single quotes may be used, such as apostrophes. Response format is Action:\`\`\`$JSON_BLOB\`\`\`then Observation

${PROMPT_6}`,
};

export const openAIFunctionAgentPrompt = formatPrompt(systemPrompts.openai);

export const bedrockToolCallingAgentPrompt = formatPrompt(systemPrompts.bedrock);

export const geminiToolCallingAgentPrompt = formatPrompt(systemPrompts.gemini);

export const formatPromptStructured = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{chat_history}'],
    [
      'human',
      '{input}\n\n{agent_scratchpad}\n\n(reminder to respond in a JSON blob no matter what)',
    ],
  ]);

export const structuredChatAgentPrompt = formatPromptStructured(systemPrompts.structuredChat);
