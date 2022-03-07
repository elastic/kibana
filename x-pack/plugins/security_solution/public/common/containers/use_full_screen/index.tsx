/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
export interface GlobalFullScreen {
  globalFullScreen: boolean;
  setGlobalFullScreen: (fullScreen: boolean) => void;
}

export interface TimelineFullScreen {
  timelineFullScreen: boolean;
  setTimelineFullScreen: (fullScreen: boolean) => void;
}

export const useGlobalFullScreen = (): GlobalFullScreen => {
  const dispatch = useDispatch();
  const globalFullScreen =
    useShallowEqualSelector(inputsSelectors.globalFullScreenSelector) ?? false;
  const setGlobalFullScreen = useCallback(
    (fullScreen: boolean) => {
      const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
      if (fullScreen) {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
        resetScroll();
      } else if (isDataGridFullScreen === false || fullScreen === false) {
        document.body.classList.remove(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
        resetScroll();
      }

      dispatch(inputsActions.setFullScreen({ id: 'global', fullScreen }));
    },
    [dispatch]
  );
  const memoizedReturn = useMemo(
    () => ({
      globalFullScreen,
      setGlobalFullScreen,
    }),
    [globalFullScreen, setGlobalFullScreen]
  );

  return memoizedReturn;
};

export const useTimelineFullScreen = (): TimelineFullScreen => {
  const dispatch = useDispatch();
  const timelineFullScreen =
    useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;
  const setTimelineFullScreen = useCallback(
    (fullScreen: boolean) => {
      const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
      if (fullScreen) {
        document.body.classList.add('euiDataGrid__restrictBody');
      } else if (isDataGridFullScreen === false || fullScreen === false) {
        document.body.classList.remove('euiDataGrid__restrictBody');
      }
      dispatch(inputsActions.setFullScreen({ id: 'timeline', fullScreen }));
    },
    [dispatch]
  );
  const memoizedReturn = useMemo(
    () => ({
      timelineFullScreen,
      setTimelineFullScreen,
    }),
    [timelineFullScreen, setTimelineFullScreen]
  );
  return memoizedReturn;
};
