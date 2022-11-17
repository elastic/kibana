/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, AssignMeta, EventObject, ExtractEvent, Typestate } from 'xstate';
import { ContextForState } from './typestate';

export const assignOnTransition =
  <T extends Typestate<{}>, E extends EventObject>() =>
  <
    StateValue extends T['value'],
    SourceStateValue extends StateValue | null,
    TargetStateValue extends StateValue,
    EventType extends E['type']
  >(
    sourceStateValue: SourceStateValue,
    _targetStateValue: TargetStateValue,
    eventType: EventType,
    assigner: TypeStateAssigner<
      ContextForState<T, SourceStateValue>,
      ContextForState<T, TargetStateValue>,
      ExtractEvent<E, EventType>
    >
  ) =>
    assign<any, E>((context, event, meta) => {
      if (!meta.state?.matches(sourceStateValue) || event.type !== eventType) {
        return context;
      }

      return assigner(context, event as any, meta as any);
    });

export type TypeStateAssigner<TSourceContext, TTargetContext, TEvent extends EventObject> = (
  context: TSourceContext,
  event: TEvent,
  meta: AssignMeta<TSourceContext, TEvent>
) => TTargetContext;
