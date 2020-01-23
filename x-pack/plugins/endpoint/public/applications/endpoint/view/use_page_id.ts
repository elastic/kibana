/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { PageId } from '../../../../endpoint_app_types';
import { RoutingAction } from '../store/routing';

/**
 * Dispatches a 'userNavigatedToPage' action with the given 'pageId' as the action payload
 */
export function usePageId(pageId: PageId) {
  const dispatch: (action: RoutingAction) => unknown = useDispatch();
  useEffect(() => {
    dispatch({ type: 'userNavigatedToPage', payload: pageId });
  }, [dispatch, pageId]);
}
