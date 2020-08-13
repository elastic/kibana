/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useEffect } from 'react';
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
  const idKey: string = `resolver-${resolverComponentInstanceID}-id`;
  const eventKey: string = `resolver-${resolverComponentInstanceID}-event`;
  const pushToQueryParams = useCallback(
    (newCrumbs: CrumbInfo) => {
      // Construct a new set of parameters from the current set (minus empty parameters)
      // by assigning the new set of parameters provided in `newCrumbs`
      const crumbsToPass = {
        ...querystring.parse(urlSearch.slice(1)),
        [idKey]: newCrumbs.crumbId,
        [eventKey]: newCrumbs.crumbEvent,
      };

      // If either was passed in as empty, remove it from the record
      if (newCrumbs.crumbId === '') {
        delete crumbsToPass[idKey];
      }
      if (newCrumbs.crumbEvent === '') {
        delete crumbsToPass[eventKey];
      }

      const relativeURL = { search: querystring.stringify(crumbsToPass) };
      // We probably don't want to nuke the user's history with a huge
      // trail of these, thus `.replace` instead of `.push`
      return history.replace(relativeURL);
    },
    [history, urlSearch, idKey, eventKey]
  );
  const queryParams: CrumbInfo = useMemo(() => {
    const parsed = querystring.parse(urlSearch.slice(1));
    const crumbEvent = parsed[eventKey];
    const crumbId = parsed[idKey];
    function valueForParam(param: string | string[]): string {
      if (Array.isArray(param)) {
        return param[0] || '';
      }
      return param || '';
    }
    return {
      crumbEvent: valueForParam(crumbEvent),
      crumbId: valueForParam(crumbId),
    };
  }, [urlSearch, idKey, eventKey]);

  useEffect(() => {
    const oldIdKey = idKey;
    const oldEventKey = eventKey;
    return () => {
      const crumbsToPass = {
        ...querystring.parse(history.location.search.slice(1)),
      };
      delete crumbsToPass[oldIdKey];
      delete crumbsToPass[oldEventKey];
      const relativeURL = { search: querystring.stringify(crumbsToPass) };
      history.replace(relativeURL);
    };
  }, [idKey, eventKey, history]);

  return {
    pushToQueryParams,
    queryParams,
  };
}
