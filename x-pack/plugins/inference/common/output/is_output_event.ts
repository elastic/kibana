/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputEvent, OutputEventType } from '.';
import type { InferenceTaskEvent } from '../inference_task';

export function isOutputEvent(event: InferenceTaskEvent): event is OutputEvent {
  return (
    event.type === OutputEventType.OutputComplete || event.type === OutputEventType.OutputUpdate
  );
}
