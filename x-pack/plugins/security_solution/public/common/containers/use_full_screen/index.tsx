/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { SCROLLING_DISABLED_CLASS_NAME } from '../../../../common/constants';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';

export const resetScroll = () => {
  setTimeout(() => {
    window.scrollTo(0, 0);

    const kibanaBody = document.querySelector('#kibana-body');
    if (kibanaBody != null) {
      kibanaBody.scrollTop = 0;
    }

    const pageContainer = document.querySelector('[data-test-subj="pageContainer"]');
    if (pageContainer != null) {
      pageContainer.scrollTop = 0;
    }
  }, 0);
};

export const useFullScreen = () => {
  const dispatch = useDispatch();
  const globalFullScreen =
    useShallowEqualSelector(inputsSelectors.globalFullScreenSelector) ?? false;
  const timelineFullScreen =
    useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

  const setGlobalFullScreen = useCallback(
    (fullScreen: boolean) => {
      if (fullScreen) {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME);
        resetScroll();
      } else {
        document.body.classList.remove(SCROLLING_DISABLED_CLASS_NAME);
        resetScroll();
      }

      dispatch(inputsActions.setFullScreen({ id: 'global', fullScreen }));
    },
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
