/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction } from 'rxjs';
import { OutputEvent, OutputEventType, OutputUpdateEvent } from '.';

export function withoutOutputUpdateEvents<T extends OutputEvent>(): OperatorFunction<
  T,
  Exclude<T, OutputUpdateEvent>
> {
  return filter(
    (event): event is Exclude<T, OutputUpdateEvent> => event.type !== OutputEventType.OutputUpdate
  );
}
