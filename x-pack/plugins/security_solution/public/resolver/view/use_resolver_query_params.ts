/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useQueryStringKeys } from './use_query_string_keys';
import { CrumbInfo } from './panels/panel_content_utilities';

export function useResolverQueryParams() {
  /**
   * This updates the breadcrumb nav and the panel view. It's supplied to each
   * panel content view to allow them to dispatch transitions to each other.
   */
  const history = useHistory();
  const urlSearch = useLocation().search;
  const { idKey, eventKey } = useQueryStringKeys();
  const pushToQueryParams = useCallback(
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
  const queryParams: CrumbInfo = useMemo(() => {
    const urlSearchParams = new URLSearchParams(urlSearch);
    return {
      // Use `''` for backwards compatibility with deprecated code.
      crumbEvent: urlSearchParams.get(eventKey) ?? '',
      crumbId: urlSearchParams.get(idKey) ?? '',
    };
  }, [urlSearch, idKey, eventKey]);

  return {
    pushToQueryParams,
    queryParams,
  };
}
