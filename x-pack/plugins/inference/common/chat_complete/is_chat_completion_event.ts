/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionEvent, ChatCompletionEventType } from '.';
import { InferenceTaskEvent } from '../inference_task';

export function isChatCompletionEvent(event: InferenceTaskEvent): event is ChatCompletionEvent {
  return (
    event.type === ChatCompletionEventType.ChatCompletionChunk ||
    event.type === ChatCompletionEventType.ChatCompletionMessage ||
    event.type === ChatCompletionEventType.ChatCompletionTokenCount
  );
}
