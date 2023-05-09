/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, isArray } from 'lodash';

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

const isObjectTypeGuard = (value: SearchTypes): value is Record<string, SearchTypes> => {
  return isPlainObject(value);
};

function traverseSource(
  document: SearchTypes,
  result: Record<string, string[]> = {},
  prefix: string[] = []
): Record<string, string[]> {
  if (isObjectTypeGuard(document)) {
    for (const [key, value] of Object.entries(document)) {
      const path = [...prefix, key];

      traverseSource(value, result, path);
    }
  } else if (isArray(document)) {
    document.forEach((doc) => {
      traverseSource(doc, result, prefix);
    });
  } else {
    result[prefix.join('.')] = prefix;
  }

  return result;
}

/**
 * Flattens a deeply nested object to a map of dot-separated paths, including nested arrays
 * NOTE: it transforms primitive value to array, i.e. {a: b} == {a: [b]}, similarly to how fields works in ES _search query
 */
export function buildFieldsKeyAsArrayMap(
  document: Record<string, SearchTypes>
): Record<string, string[]> {
  if (!isPlainObject(document)) {
    return {};
  }

  return traverseSource(document);
}
