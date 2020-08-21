/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlDrilldownGlobalScope, UrlDrilldownScope } from './types';
import { getFlattenedObject } from '../../../../../../src/core/public';

export function buildScope<
  ContextScope extends object = object,
  EventScope extends object = object
>({
  globalScope,
  contextScope,
  eventScope,
}: {
  globalScope: UrlDrilldownGlobalScope;
  contextScope?: ContextScope;
  eventScope?: EventScope;
}): UrlDrilldownScope<ContextScope, EventScope> {
  return {
    ...globalScope,
    context: contextScope,
    event: eventScope,
  };
}

export function buildScopeSuggestions(scope: UrlDrilldownGlobalScope): string[] {
  return Object.keys(getFlattenedObject(scope));
}
