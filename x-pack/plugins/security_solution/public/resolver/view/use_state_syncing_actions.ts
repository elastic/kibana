/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const locationSearch = useLocation().search;
  useLayoutEffect(() => {
    dispatch({
      type: 'appReceivedNewExternalProperties',
      payload: { databaseDocumentID, resolverComponentInstanceID, locationSearch },
    });
  }, [dispatch, databaseDocumentID, resolverComponentInstanceID, locationSearch]);
}
