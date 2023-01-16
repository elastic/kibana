/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
import { useEffect } from 'react';
import { OVERVIEW_ROUTE } from '../../../../../../common/constants';
import { hideTestNowFlyoutAction, testNowRunsSelector } from '../../../state/manual_test_runs';

export const useTestFlyoutOpen = () => {
  const testNowRuns = useSelector(testNowRunsSelector);

  const isOverview = useRouteMatch({
    path: [OVERVIEW_ROUTE],
  });

  const dispatch = useDispatch();

  const flyoutTestOpen = Object.values(testNowRuns).find((value) => {
    return value.isTestNowFlyoutOpen;
  });

  useEffect(() => {
    if (!isOverview?.isExact && flyoutTestOpen) {
      dispatch(hideTestNowFlyoutAction());
    }
  });

  return flyoutTestOpen;
};
