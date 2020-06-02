/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as q from 'query-string';
import { Middleware } from 'redux';
// @ts-ignore
import { showHiddenIndicesChanged } from '../actions';

export const syncUrlHashQueryParam: Middleware = () => (next) => (action) => {
  if (action.type === String(showHiddenIndicesChanged)) {
    const { url, query } = q.parseUrl(window.location.hash);
    if (action.payload.showHiddenIndices) {
      query.includeHidden = 'true';
    } else {
      delete query.includeHidden;
    }
    window.location.hash = url + '?' + q.stringify(query);
  }
  next(action);
};
