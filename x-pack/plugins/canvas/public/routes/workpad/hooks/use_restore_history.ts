/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
// @ts-expect-error
import { restoreHistory } from '../../../state/actions/history';
import { initializeWorkpad } from '../../../state/actions/workpad';
import { decode } from '../route_state';

export const useRestoreHistory = () => {
  const history = useHistory();
  const location = useLocation<string>();
  const dispatch = useDispatch();

  const { state: historyState } = location;
  const previousState = useRef<string | undefined>(historyState);
  const historyAction = history.action.toLowerCase();

  useEffect(() => {
    const isBrowserNav = historyAction === 'pop' && historyState != null;
    if (isBrowserNav && historyState !== previousState.current) {
      previousState.current = historyState;
      dispatch(restoreHistory(decode(historyState)));
      dispatch(initializeWorkpad());
    }

    previousState.current = historyState;
  }, [dispatch, historyAction, historyState]);
};
