/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowState } from '@kbn/wc-framework-types-server';

/**
 * Interpolate the given value against the provided state.
 */
export function interpolateValue<T = any>(value: any, state: WorkflowState): T {
  if (typeof value === 'string') {
    // Check for exact match: "{key}"
    const exactMatch = value.match(/^\{([^}]+)\}$/);
    if (exactMatch) {
      const key = exactMatch[1];
      return (state.has(key) ? state.get(key) : value) as T;
    }

    // Check for interpolation within a string: "string with {key}"
    return value.replace(/\{([^}]+)\}/g, (match, key) => {
      return state.has(key) ? String(state.get(key)) : match;
    }) as T;
  }

  if (Array.isArray(value)) {
    // Recursively interpolate each element in the array
    return value.map((item) => interpolateValue(item, state)) as T;
  }

  // Check if it's a plain object (created via {} or new Object()) before recursing
  if (
    typeof value === 'object' &&
    value !== null &&
    value.constructor === Object // More specific check for plain objects
  ) {
    // Recursively interpolate each value in the object
    const newObj: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newObj[key] = interpolateValue(value[key], state);
      }
    }
    return newObj as T;
  }

  // Return primitives and null/undefined as is
  return value;
}
