/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject } from 'rxjs';
import { ActionFunction, EventObject, Expr, Subscribable } from 'xstate';

export interface NotificationChannel<TContext, TEvent extends EventObject, TSentEvent> {
  createService: () => Subscribable<TSentEvent>;
  notify: (
    eventExpr: Expr<TContext, TEvent, TSentEvent | undefined>
  ) => ActionFunction<TContext, TEvent>;
}

export const createNotificationChannel = <
  TContext,
  TEvent extends EventObject,
  TSentEvent
>(): NotificationChannel<TContext, TEvent, TSentEvent> => {
  const eventsSubject = new ReplaySubject<TSentEvent>(1);

  const createService = () => eventsSubject.asObservable();

  const notify =
    (eventExpr: Expr<TContext, TEvent, TSentEvent | undefined>) =>
    (context: TContext, event: TEvent) => {
      const eventToSend = eventExpr(context, event);

      if (eventToSend != null) {
        eventsSubject.next(eventToSend);
      }
    };

  return {
    createService,
    notify,
  };
};
