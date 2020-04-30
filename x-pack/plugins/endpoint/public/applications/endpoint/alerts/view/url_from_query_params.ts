/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import { AlertingIndexUIQueryParams } from '../../../../../common/alerts/types';
import { EndpointAppLocation } from '../../types';

/**
 * Return a relative URL for `AlertingIndexUIQueryParams`.
 * usage:
 *
 * ```ts
 * // Replace this with however you get state, e.g. useSelector in react
 * const queryParams = selectors.uiQueryParams(store.getState())
 *
 * // same as current url, but page_index is now 3
 * const relativeURL = urlFromQueryParams({ ...queryParams, page_index: 3 })
 *
 * // now use relativeURL in the 'href' of a link, the 'to' of a react-router-dom 'Link' or history.push, history.replace
 * ```
 */
export function urlFromQueryParams(
  queryParams: AlertingIndexUIQueryParams
): Partial<EndpointAppLocation> {
  const search = querystring.stringify(queryParams);
  return {
    search,
  };
}
