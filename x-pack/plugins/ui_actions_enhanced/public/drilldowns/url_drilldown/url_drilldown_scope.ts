/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import partition from 'lodash/partition';
import { getFlattenedObject } from '@kbn/std';
import { UrlDrilldownGlobalScope, UrlDrilldownScope } from './types';

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

/**
 * Builds list of variables for suggestion from scope
 * keys sorted alphabetically, except {{event.$}} variables are pulled to the top
 * @param scope
 */
export function buildScopeSuggestions(scope: UrlDrilldownGlobalScope): string[] {
  const allKeys = Object.keys(getFlattenedObject(scope)).sort();
  const [eventKeys, otherKeys] = partition(allKeys, (key) => key.startsWith('event'));
  return [...eventKeys, ...otherKeys];
}
