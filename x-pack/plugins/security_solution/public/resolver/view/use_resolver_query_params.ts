/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { useHistory, useLocation } from 'react-router-dom';
import { CrumbInfo } from './panels/panel_content_utilities';

export function useResolverQueryParams(documentLocation: string) {
  /**
   * This updates the breadcrumb nav and the panel view. It's supplied to each
   * panel content view to allow them to dispatch transitions to each other.
   */
  const history = useHistory();
  const urlSearch = useLocation().search;
  const uniqueCrumbIdKey = `${documentLocation}CrumbId`;
  const uniqueCrumbEventKey = `${documentLocation}CrumbEvent`;
  const pushToQueryParams = useCallback(
    (newCrumbs: CrumbInfo) => {
      // Construct a new set of params from the current set (minus empty params)
      // by assigning the new set of params provided in `newCrumbs`
      const crumbsToPass = {
        ...querystring.parse(urlSearch.slice(1)),
        [uniqueCrumbIdKey]: newCrumbs.crumbId,
        [uniqueCrumbEventKey]: newCrumbs.crumbEvent,
      };

      // If either was passed in as empty, remove it from the record
      if (crumbsToPass.uniqueCrumbIdKey === '') {
        delete crumbsToPass.uniqueCrumbIdKey;
      }
      if (crumbsToPass.uniqueCrumbEventKey === '') {
        delete crumbsToPass.uniqueCrumbEventKey;
      }

      const relativeURL = { search: querystring.stringify(crumbsToPass) };
      // We probably don't want to nuke the user's history with a huge
      // trail of these, thus `.replace` instead of `.push`
      return history.replace(relativeURL);
    },
    [history, urlSearch, uniqueCrumbIdKey, uniqueCrumbEventKey]
  );
  const queryParams: CrumbInfo = useMemo(() => {
    const newParams = {
      [uniqueCrumbIdKey]: '',
      [uniqueCrumbEventKey]: '',
      ...querystring.parse(urlSearch.slice(1)),
    };
    newParams.crumbId = newParams[uniqueCrumbIdKey];
    newParams.crumbEvent = newParams[uniqueCrumbEventKey];
    return newParams;
  }, [urlSearch, uniqueCrumbIdKey, uniqueCrumbEventKey]);

  return {
    pushToQueryParams,
    queryParams,
  };
}
