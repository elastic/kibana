/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import * as selectors from '../store/selectors';
import { CrumbInfo } from './panels/panel_content_utilities';

export function useResolverQueryParams() {
  /**
   * This updates the breadcrumb nav and the panel view. It's supplied to each
   * panel content view to allow them to dispatch transitions to each other.
   */
  const history = useHistory();
  const urlSearch = useLocation().search;
  const resolverComponentInstanceID = useSelector(selectors.resolverComponentInstanceID);
  const uniqueCrumbIdKey: string = `${resolverComponentInstanceID}CrumbId`;
  const uniqueCrumbEventKey: string = `${resolverComponentInstanceID}CrumbEvent`;
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
      if (newCrumbs.crumbId === '') {
        delete crumbsToPass[uniqueCrumbIdKey];
      }
      if (newCrumbs.crumbEvent === '') {
        delete crumbsToPass[uniqueCrumbEventKey];
      }

      const relativeURL = { search: querystring.stringify(crumbsToPass) };
      // We probably don't want to nuke the user's history with a huge
      // trail of these, thus `.replace` instead of `.push`
      return history.replace(relativeURL);
    },
    [history, urlSearch, uniqueCrumbIdKey, uniqueCrumbEventKey]
  );
  const queryParams: CrumbInfo = useMemo(() => {
    const parsed = querystring.parse(urlSearch.slice(1));
    const crumbEvent = parsed[uniqueCrumbEventKey];
    const crumbId = parsed[uniqueCrumbIdKey];
    return {
      crumbEvent: Array.isArray(crumbEvent) ? crumbEvent[0] : crumbEvent,
      crumbId: Array.isArray(crumbId) ? crumbId[0] : crumbId,
    };
  }, [urlSearch, uniqueCrumbIdKey, uniqueCrumbEventKey]);

  return {
    pushToQueryParams,
    queryParams,
  };
}
