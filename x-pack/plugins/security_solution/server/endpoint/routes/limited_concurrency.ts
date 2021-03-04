/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPreAuthToolkit,
} from 'kibana/server';
import {
  LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG,
  LIMITED_CONCURRENCY_ENDPOINT_COUNT,
} from '../../../common/endpoint/constants';

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
    if (this.counter > 0) {
      this.counter -= 1;
    }
  }
  lessThanMax() {
    return this.counter < this.max;
  }
}

function shouldHandleRequest(request: KibanaRequest) {
  const tags = request.route.options.tags;
  return tags.includes(LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG);
}

export function registerLimitedConcurrencyRoutes(core: CoreSetup) {
  const counter = new MaxCounter(LIMITED_CONCURRENCY_ENDPOINT_COUNT);
  core.http.registerOnPreAuth(function preAuthHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreAuthToolkit
  ) {
    if (!shouldHandleRequest(request)) {
      return toolkit.next();
    }

    if (!counter.lessThanMax()) {
      return response.customError({
        body: 'Too Many Requests',
        statusCode: 429,
      });
    }

    counter.increase();

    // requests.events.aborted$ has a bug (but has test which explicitly verifies) where it's fired even when the request completes
    // https://github.com/elastic/kibana/pull/70495#issuecomment-656288766
    request.events.aborted$.toPromise().then(() => {
      counter.decrease();
    });

    return toolkit.next();
  });
}
