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
  VERTEX_SYSTEM_PROMPT,
} from './nodes/translations';

export const formatPrompt = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

export const systemPrompts = {
  openai: DEFAULT_SYSTEM_PROMPT,
  bedrock: `${DEFAULT_SYSTEM_PROMPT} ${BEDROCK_SYSTEM_PROMPT}`,
  gemini: `${DEFAULT_SYSTEM_PROMPT} ${VERTEX_SYSTEM_PROMPT}`,
  structuredChat: `Respond to the human as helpfully and accurately as possible. You have access to the following tools:

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

Begin! Reminder to ALWAYS respond with a valid json blob of a single action with no additional output. When using tools, ALWAYS input the expected JSON schema args. Your answer will be parsed as JSON, so never use double quotes within the output and instead use backticks. Single quotes may be used, such as apostrophes. Response format is Action:\`\`\`$JSON_BLOB\`\`\`then Observation`,
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
