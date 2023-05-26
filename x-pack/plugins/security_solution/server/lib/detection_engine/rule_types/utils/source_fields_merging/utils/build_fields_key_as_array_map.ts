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
  if (prefix.length) {
    result[prefix.join('.')] = prefix;
  }

  if (isObjectTypeGuard(document)) {
    for (const [key, value] of Object.entries(document)) {
      const path = [...prefix, key];

      traverseSource(value, result, path);
    }
  } else if (isArray(document)) {
    // for array of primitive values we can call traverseSource once
    if (isPlainObject(document[0])) {
      traverseSource(document[0], result, prefix);
    } else {
      document.forEach((doc) => {
        traverseSource(doc, result, prefix);
      });
    }
  }

  return result;
}

/**
 * takes object document and creates map of string field keys to array field keys
 * source  `{ 'a.b': { c: { d: 1 } } }`
 * will result in map: `{
 *     'a.b': ['a.b'],
 *     'a.b.c': ['a.b', 'c'],
 *     'a.b.c.d': ['a.b', 'c', 'd'],
 *   }`
 * @param document - Record<string, SearchTypes>
 **/
export function buildFieldsKeyAsArrayMap(
  document: Record<string, SearchTypes>
): Record<string, string[]> {
  if (!isPlainObject(document)) {
    return {};
  }

  return traverseSource(document);
}
