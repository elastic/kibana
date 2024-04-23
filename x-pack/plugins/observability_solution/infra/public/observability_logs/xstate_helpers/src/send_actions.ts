/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actions,
  ActorRef,
  AnyEventObject,
  EventObject,
  Expr,
  PureAction,
  SendActionOptions,
} from 'xstate';

export const sendIfDefined =
  <TSentEvent extends EventObject = AnyEventObject>(target: string | ActorRef<TSentEvent>) =>
  <TContext, TEvent extends EventObject>(
    eventExpr: Expr<TContext, TEvent, TSentEvent | undefined>,
    options?: SendActionOptions<TContext, TEvent>
  ): PureAction<TContext, TEvent> => {
    return actions.pure((context, event) => {
      const targetEvent = eventExpr(context, event);

      return targetEvent != null
        ? [
            actions.send(targetEvent, {
              ...options,
              to: target,
            }),
          ]
        : undefined;
    });
  };
