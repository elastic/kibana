/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLayoutEffect } from 'react';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { useHistory, useLocation } from 'react-router-dom';
import { useResolverDispatch } from './use_resolver_dispatch';

/**
 * This is a hook that is meant to be used once at the top level of Resolver.
 * It dispatches actions that keep the store in sync with external properties.
 */
export function useStateSyncingActions({
  databaseDocumentID,
  resolverComponentInstanceID,
}: {
  /**
   * The `_id` of an event in ES. Used to determine the origin of the Resolver graph.
   */
  databaseDocumentID?: string;
  resolverComponentInstanceID: string;
}) {
  const dispatch = useResolverDispatch();
  const history = useHistory();
  const urlSearch = useLocation().search;
  const panelIdKey: string = `resolver-${resolverComponentInstanceID}-id`;
  const panelEventTypeKey: string = `resolver-${resolverComponentInstanceID}-event`;
  const parsed = querystring.parse(urlSearch.slice(1));
  const panelEventType = parsed[panelEventTypeKey];
  const panelEventID = parsed[panelIdKey];
  useLayoutEffect(() => {
    dispatch({
      type: 'appReceivedNewExternalProperties',
      payload: { databaseDocumentID, resolverComponentInstanceID, panelEventType, panelEventID },
    });
    // return () => {
    //   console.log('return runnin');
    //   const crumbsToPass = {
    //     ...querystring.parse(urlSearch.slice(1)),
    //   };
    //   delete crumbsToPass[uniqueCrumbIdKey];
    //   delete crumbsToPass[uniqueCrumbEventKey];
    //   const relativeURL = { search: querystring.stringify(crumbsToPass) };
    //   history.replace(relativeURL);
    // };
  }, [
    dispatch,
    databaseDocumentID,
    resolverComponentInstanceID,
    urlSearch,
    history,
    panelEventID,
    panelEventType,
  ]);
}
