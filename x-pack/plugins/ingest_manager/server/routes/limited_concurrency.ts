/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPreAuthToolkit,
} from 'kibana/server';
import { LIMITED_CONCURRENCY_ROUTE_TAG } from '../../common';
import { IngestManagerConfigType } from '../index';

export class MaxCounter {
  constructor(private readonly max: number = 1) {}
  private counter = 0;
  valueOf() {
    return this.counter;
  }
  increase() {
    if (this.counter < this.max) {
      this.counter += 1;
    }
  }
  decrease() {
    if (this.counter > 0) {
      this.counter -= 1;
    }
  }
  lessThanMax() {
    return this.counter < this.max;
  }
}

export type IMaxCounter = Pick<MaxCounter, 'increase' | 'decrease' | 'lessThanMax'>;

export function isLimitedRoute(request: KibanaRequest) {
  const tags = request.route.options.tags;
  return !!tags.includes(LIMITED_CONCURRENCY_ROUTE_TAG);
}

export function createLimitedPreAuthHandler({
  isMatch,
  maxCounter,
}: {
  isMatch: (request: KibanaRequest) => boolean;
  maxCounter: IMaxCounter;
}) {
  return async function preAuthHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreAuthToolkit
  ) {
    if (!isMatch(request)) {
      return toolkit.next();
    }

    if (!maxCounter.lessThanMax()) {
      return response.customError({
        body: 'Too Many Requests',
        statusCode: 429,
      });
    }

    maxCounter.increase();

    console.log('CREATE SUB', request.events.aborted$);
    request.events.aborted$.subscribe((ev) => {
      console.log('EVENT', ev);
    }, console.log);

    await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
    maxCounter.decrease();

    console.log('AFTER TIMER 1');

    return toolkit.next();
  };
}

export function registerLimitedConcurrencyRoutes(core: CoreSetup, config: IngestManagerConfigType) {
  const max = config.fleet.maxConcurrentConnections;
  if (!max) return;

  core.http.registerOnPreAuth(
    createLimitedPreAuthHandler({
      isMatch: isLimitedRoute,
      maxCounter: new MaxCounter(max),
    })
  );
}
