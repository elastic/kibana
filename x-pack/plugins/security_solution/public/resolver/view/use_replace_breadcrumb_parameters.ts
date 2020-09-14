/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useQueryStringKeys } from './use_query_string_keys';
import { CrumbInfo } from '../types';

/**
 * @deprecated
 * Update the browser's `search` with data from `queryStringState`. The URL search parameter names
 * will include Resolver's `resolverComponentInstanceID`.
 */
export function useReplaceBreadcrumbParameters(): (queryStringState: CrumbInfo) => void {
  /**
   * This updates the breadcrumb nav and the panel view. It's supplied to each
   * panel content view to allow them to dispatch transitions to each other.
   */
  const history = useHistory();
  const urlSearch = useLocation().search;
  const { idKey, eventKey } = useQueryStringKeys();
  return useCallback(
    (queryStringState: CrumbInfo) => {
      const urlSearchParams = new URLSearchParams(urlSearch);

      urlSearchParams.set(idKey, queryStringState.crumbId);
      urlSearchParams.set(eventKey, queryStringState.crumbEvent);

      // If either was passed in as empty, remove it
      if (queryStringState.crumbId === '') {
        urlSearchParams.delete(idKey);
      }
      if (queryStringState.crumbEvent === '') {
        urlSearchParams.delete(eventKey);
      }

      const relativeURL = { search: urlSearchParams.toString() };
      // We probably don't want to nuke the user's history with a huge
      // trail of these, thus `.replace` instead of `.push`
      return history.replace(relativeURL);
    },
    [history, urlSearch, idKey, eventKey]
  );
}
