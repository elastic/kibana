/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { MetaDataProps } from './types';

const TITLE_KEYS = ['title', 'name'];

const isRecord = (source: unknown | undefined): source is Record<PropertyKey, unknown> => {
  return typeof source === 'object' && source !== null;
};

function hasStringKey<T extends Record<PropertyKey, unknown>, K extends PropertyKey>(
  source: T,
  key: K
): source is T & Record<K, string> {
  return typeof source[key] === 'string';
}

export const resultTitle = (result: SearchHit): string | undefined => {
  if (isRecord(result._source)) {
    for (const key of TITLE_KEYS) {
      if (hasStringKey(result._source, key)) {
        return result._source[key];
      }
    }
  }
  return undefined;
};

export const resultMetaData = (result: SearchHit): MetaDataProps => ({
  id: result._id,
  title: resultTitle(result),
});
