/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventObject, Typestate } from 'xstate';
import { assignOnTransition } from './assign_action';

export const createTypestateHelpers = <T extends Typestate<{}>, E extends EventObject>() => ({
  assignOnTransition: assignOnTransition<T, E>(),
});

export type ContextForState<
  T extends Typestate<{}>,
  StateValue extends T['value'] | null
> = T extends null
  ? T['context']
  : T extends {
      value: StateValue;
    }
  ? T['context']
  : never;
