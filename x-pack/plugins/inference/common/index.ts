/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  correctCommonEsqlMistakes,
  splitIntoCommands,
} from './tasks/nl_to_esql/correct_common_esql_mistakes';

export { isChatCompletionChunkEvent } from './chat_complete/is_chat_completion_chunk_event';
export { isChatCompletionMessageEvent } from './chat_complete/is_chat_completion_message_event';
export { isChatCompletionEvent } from './chat_complete/is_chat_completion_event';

export { isOutputUpdateEvent } from './output/is_output_update_event';
export { isOutputCompleteEvent } from './output/is_output_complete_event';
export { isOutputEvent } from './output/is_output_event';

export type { ToolSchema } from './chat_complete/tool_schema';

export {
  type Message,
  MessageRole,
  type ToolMessage,
  type AssistantMessage,
  type UserMessage,
} from './chat_complete';

export { generateFakeToolCallId } from './chat_complete/generate_fake_tool_call_id';
