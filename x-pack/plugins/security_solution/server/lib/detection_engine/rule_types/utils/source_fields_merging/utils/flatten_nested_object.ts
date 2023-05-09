/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, isArray } from 'lodash';

/**
 * Flattens a deeply nested object to a map of dot-separated paths, including nested arrays
 * NOTE: it transforms primitive value to array, i.e. {a: b} == {a: [b]}, similarly to how fields works in ES _search query
 */

export function flatten(
  document: Record<string, unknown>,
  res: Record<string, unknown> = {},
  prefix: string = ''
) {
  if (isPlainObject(document)) {
    for (const [key, value] of Object.entries(document)) {
      const path = prefix ? `${prefix}.${key}` : key;

      flatten(value as Record<string, unknown>, res, path);
    }
  } else if (isArray(document)) {
    document.forEach((doc) => {
      flatten(doc, res, prefix);
    });
  } else {
    if (isArray(res[prefix])) {
      (res[prefix] as unknown[]).push(document);
    } else {
      res[prefix] = [document];
    }
  }

  return res;
}

export function flattenNestedObject(document: Record<string, unknown>) {
  if (!isPlainObject(document)) {
    return document;
  }

  return flatten(document);
}
