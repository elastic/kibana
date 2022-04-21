/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchSource } from '@kbn/data-plugin/common';

export function wrapSearchSourceFetch(abortController: AbortController) {
  return async (searchSource: ISearchSource) => {
    try {
      return await searchSource.fetch({ abortSignal: abortController.signal });
    } catch (e) {
      if (abortController.signal.aborted) {
        throw new Error('Search has been aborted due to cancelled execution');
      }
      throw e;
    }
  };
}
