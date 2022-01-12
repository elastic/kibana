/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, SCREENSHOTTING_CONTEXT_KEY } from '../common/context';

declare global {
  interface Window {
    [SCREENSHOTTING_CONTEXT_KEY]?: Context;
  }
}

export class ContextStorage {
  get<T extends Context = Context>(): T {
    return (window[SCREENSHOTTING_CONTEXT_KEY] ?? {}) as T;
  }
}
