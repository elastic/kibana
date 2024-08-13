/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputEventType, OutputCompleteEvent, OutputEvent } from '.';

import type { ToolOptions } from '../chat_complete/tools';

export function isOutputCompleteEvent<TId extends string, TToolOptions extends ToolOptions<string>>(
  event: OutputEvent<TId, TToolOptions>
): event is OutputCompleteEvent<TId, TToolOptions> {
  return event.type === OutputEventType.OutputComplete;
}
