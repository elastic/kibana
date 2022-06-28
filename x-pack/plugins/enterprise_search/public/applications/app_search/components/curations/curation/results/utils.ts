/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Result, ResultMeta } from '../../../result/types';
import { CurationResult } from '../../types';

/**
 * The `promoted` and `hidden` keys from the internal curations endpoints
 * currently return a document data structure that our Result component can't
 * correctly parse - we need to attempt to naively transform the data in order
 * to display it in a Result
 *
 * TODO: Ideally someday we can update our internal curations endpoint to return
 * the same Result-ready data structure that the `organic` endpoint uses, and
 * remove this file when that happens
 */

const mergeMetas = (partialMeta: ResultMeta, secondPartialMeta: ResultMeta): ResultMeta => {
  return {
    ...(partialMeta || {}),
    ...secondPartialMeta,
  };
};

export const convertToResultFormat = (document: CurationResult): Result => {
  const result = {} as Result;

  // Convert `key: 'value'` into `key: { raw: 'value' }`
  Object.entries(document).forEach(([key, value]) => {
    // don't convert _meta if exists
    if (key === '_meta') {
      result[key] = value as ResultMeta;
    } else {
      result[key] = {
        raw: value,
        snippet: null, // Don't try to provide a snippet, we can't really guesstimate it
      };
    }
  });

  // Add the _meta obj needed by Result
  const convertedMetaObj = convertIdToMeta(document.id);
  result._meta = mergeMetas(result._meta, convertedMetaObj);

  return result;
};

export const convertIdToMeta = (id: string): Result['_meta'] => {
  const splitId = id.split('|');
  const isMetaEngine = splitId.length > 1;

  return isMetaEngine
    ? {
        engine: splitId[0],
        id: splitId[1],
      }
    : ({ id } as Result['_meta']);
  // Note: We're casting this as _meta even though `engine` is missing,
  // since for source engines the engine shouldn't matter / be displayed,
  // but if needed we could likely populate this from EngineLogic.values
};
