/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { PageId } from '../../../../common/types';
import { RoutingAction } from '../store/routing';

/**
 * Dispatches a 'userNavigatedToPage' action with the given 'pageId' as the action payload.
 * When the component is un-mounted, a `userNavigatedFromPage` action will be dispatched
 * with the given `pageId`.
 *
 * @param pageId A page id
 */
export function usePageId(pageId: PageId) {
  const dispatch: (action: RoutingAction) => unknown = useDispatch();
  useEffect(() => {
    dispatch({ type: 'userNavigatedToPage', payload: pageId });

    return () => {
      dispatch({ type: 'userNavigatedFromPage', payload: pageId });
    };
  }, [dispatch, pageId]);
}
