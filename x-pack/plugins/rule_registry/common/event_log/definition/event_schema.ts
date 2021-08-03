/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export interface EventSchema<TEvent> {
  eventType: t.Type<TEvent>;
  event: TEvent;
}

export abstract class Schema {
  public static create<TEvent>(eventType: t.Type<TEvent>): EventSchema<TEvent> {
    return {
      eventType,
      event: {} as t.TypeOf<typeof eventType>,
    };
  }

  public static combine<T1, T2>(s1: EventSchema<T1>, s2: EventSchema<T2>): EventSchema<T1 & T2> {
    const combinedType = t.intersection([s1.eventType, s2.eventType]);
    return this.create(combinedType);
  }
}
