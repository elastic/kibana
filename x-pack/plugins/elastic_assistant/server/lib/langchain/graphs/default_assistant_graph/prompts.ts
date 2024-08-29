/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DEFAULT_SYSTEM_PROMPT } from './nodes/translations';

export const formatPrompt = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

export const systemPrompts = {
  openai: DEFAULT_SYSTEM_PROMPT,
  bedrock: `${DEFAULT_SYSTEM_PROMPT} Use tools as often as possible, as they have access to the latest data and syntax. Always return value from ESQLKnowledgeBaseTool as is. Never return <thinking> tags in the response, but make sure to include <result> tags content in the response. Do not reflect on the quality of the returned search results in your response.`,
  gemini:
    `${DEFAULT_SYSTEM_PROMPT} ALWAYS use the tools provided, as they have access to the latest data and syntax. ` +
    "The final response is the only output the user sees and should be a complete answer to the user's question. Do not leave out important tool output. The final response should never be empty.",
  structuredChat:
    'Respond to the human as helpfully and accurately as possible. You have access to the following tools:\n\n' +
    '{tools}\n\n' +
    `The tool action_input should ALWAYS follow the tool JSON schema args.\n\n` +
    'Valid "action" values: "Final Answer" or {tool_names}\n\n' +
    'Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input strictly adhering to the tool JSON schema args).\n\n' +
    'Provide only ONE action per $JSON_BLOB, as shown:\n\n' +
    '```\n\n' +
    '{{\n\n' +
    '  "action": $TOOL_NAME,\n\n' +
    '  "action_input": $TOOL_INPUT\n\n' +
    '}}\n\n' +
    '```\n\n' +
    'Follow this format:\n\n' +
    'Question: input question to answer\n\n' +
    'Thought: consider previous and subsequent steps\n\n' +
    'Action:\n\n' +
    '```\n\n' +
    '$JSON_BLOB\n\n' +
    '```\n\n' +
    'Observation: action result\n\n' +
    '... (repeat Thought/Action/Observation N times)\n\n' +
    'Thought: I know what to respond\n\n' +
    'Action:\n\n' +
    '```\n\n' +
    '{{\n\n' +
    '  "action": "Final Answer",\n\n' +
    // important, no new line here
    '  "action_input": "Final response to human"' +
    '}}\n\n' +
    'Begin! Reminder to ALWAYS respond with a valid json blob of a single action with no additional output. When using tools, ALWAYS input the expected JSON schema args. Your answer will be parsed as JSON, so never use double quotes within the output and instead use backticks. Single quotes may be used, such as apostrophes. Response format is Action:```$JSON_BLOB```then Observation',
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
