/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, LifecycleResponseFactory, OnPreAuthToolkit } from 'kibana/server';
import { LIMITED_CONCURRENCY_ROUTE_TAG } from '../../common';

class MaxCounter {
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
    this.counter += 1;
  }
  lessThanMax() {
    return this.counter < this.max;
  }
}

function shouldHandleRequest(request: KibanaRequest) {
  const tags = request.route.options.tags;
  return tags.includes(LIMITED_CONCURRENCY_ROUTE_TAG);
}

const LIMITED_CONCURRENCY_MAX_REQUESTS = 250;
const counter = new MaxCounter(LIMITED_CONCURRENCY_MAX_REQUESTS);

export function preAuthHandler(
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPreAuthToolkit
) {
  if (!shouldHandleRequest(request)) {
    return toolkit.next();
  }

  if (!counter.lessThanMax()) {
    return response.customError({
      body: 'Too Many Agents',
      statusCode: 503,
      headers: {
        'Retry-After': '30',
      },
    });
  }

  counter.increase();

  // requests.events.aborted$ has a bug where it's fired even when the request completes...
  // we can take advantage of this bug just for load testing...
  request.events.aborted$.toPromise().then(() => counter.decrease());

  return toolkit.next();
}
