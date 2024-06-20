/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const openAIFunctionAgentPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a helpful assistant\n\nUse the below context as a sample of information about the user from their knowledge base:\n\n```{knowledge_history}```',
  ],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

export const structuredChatAgentPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    'Respond to the human as helpfully and accurately as possible. You have access to the following tools:\n\n' +
      '{tools}\n\n' +
      'Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input).\n\n' +
      'Valid "action" values: "Final Answer" or {tool_names}\n\n' +
      'Provide only ONE action per $JSON_BLOB, as shown:\n\n' +
      '```\n\n' +
      '{{\n\n' +
      '  "action": $TOOL_NAME,\n\n' +
      '  "action_input": $INPUT\n\n' +
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
      '  "action_input": "Final response to human"\n\n' +
      '}}\n\n' +
      'Begin! Reminder to ALWAYS respond with a valid json blob of a single action. Use tools if necessary. Respond directly if appropriate. Format is Action:```$JSON_BLOB```then Observation',
  ],
  ['placeholder', '{chat_history}'],
  [
    'human',
    'Use the below context as a sample of information about the user from their knowledge base:\n\n```\n{knowledge_history}\n```\n\n{input}\n\n{agent_scratchpad}\n(reminder to respond in a JSON blob no matter what)',
  ],
]);
