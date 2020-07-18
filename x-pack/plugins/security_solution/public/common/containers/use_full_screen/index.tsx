/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';

export const useFullScreen = () => {
  const dispatch = useDispatch();
  const globalFullScreen = useSelector(inputsSelectors.globalFullScreenSelector) ?? false;
  const timelineFullScreen = useSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

  const setGlobalFullScreen = useCallback(
    (fullScreen: boolean) => dispatch(inputsActions.setFullScreen({ id: 'global', fullScreen })),
    [dispatch]
  );

  const setTimelineFullScreen = useCallback(
    (fullScreen: boolean) => dispatch(inputsActions.setFullScreen({ id: 'timeline', fullScreen })),
    [dispatch]
  );

  const memoizedReturn = useMemo(
    () => ({
      globalFullScreen,
      setGlobalFullScreen,
      setTimelineFullScreen,
      timelineFullScreen,
    }),
    [globalFullScreen, setGlobalFullScreen, setTimelineFullScreen, timelineFullScreen]
  );

  return memoizedReturn;
};
