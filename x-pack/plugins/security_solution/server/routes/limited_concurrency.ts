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
import { LIMITED_CONCURRENCY_ROUTE_TAG_PREFIX } from '../../common/constants';

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

function getRouteConcurrencyTag(request: KibanaRequest) {
  const tags = request.route.options.tags;
  return tags.find((tag) => tag.startsWith(LIMITED_CONCURRENCY_ROUTE_TAG_PREFIX));
}

function shouldHandleRequest(request: KibanaRequest) {
  return getRouteConcurrencyTag(request) !== undefined;
}

function getRouteMaxConcurrency(request: KibanaRequest) {
  const tag = getRouteConcurrencyTag(request);
  return parseInt(tag?.split(':')[2] || '', 10);
}

const initCounterMap = () => {
  const counterMap = new Map<string, MaxCounter>();
  const getCounter = (request: KibanaRequest) => {
    const path = request.route.path;

    if (!counterMap.has(path)) {
      const maxCount = getRouteMaxConcurrency(request);
      if (isNaN(maxCount)) {
        return null;
      }

      counterMap.set(path, new MaxCounter(maxCount));
    }

    return counterMap.get(path) as MaxCounter;
  };

  return {
    getCounter,
  };
};

/**
 * This method limits concurrency for routes
 * It checks if route has tag that begins LIMITED_CONCURRENCY_ROUTE_TAG_PREFIX prefix
 * If tag is found and has concurrency number separated by colon ':', this max concurrency number will be applied to the route
 * If tag is malformed, i.e. not valid concurrency number, max concurency will not be applied to the route
 * @param core CoreSetup Context passed to the `setup` method of `standard` plugins.
 */
export function registerLimitedConcurrencyRoutes(core: CoreSetup) {
  const countersMap = initCounterMap();

  core.http.registerOnPreAuth(function preAuthHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreAuthToolkit
  ) {
    if (!shouldHandleRequest(request)) {
      return toolkit.next();
    }

    const counter = countersMap.getCounter(request);

    if (counter === null) {
      return toolkit.next();
    }

    if (!counter.lessThanMax()) {
      return response.customError({
        body: 'Too Many Requests',
        statusCode: 429,
      });
    }

    counter.increase();

    // when request is completed or aborted, decrease counter
    request.events.completed$.subscribe(() => {
      counter.decrease();
    });

    return toolkit.next();
  });
}
