/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputEvent, OutputEventType, OutputUpdateEvent } from '.';

export function isOutputCompleteEvent<TOutputEvent extends OutputEvent>(
  event: TOutputEvent
): event is Exclude<TOutputEvent, OutputUpdateEvent> {
  return event.type === OutputEventType.OutputComplete;
}
