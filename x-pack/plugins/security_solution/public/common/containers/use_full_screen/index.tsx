/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
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

export const setDataGridFullScreen = (isExpanded: boolean) => {
  const clickEvent = new KeyboardEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  const dataGridIsFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
  const dataGridFullScreenButtonNew = document.querySelector(
    '[data-test-subj="dataGridFullScrenButton"]'
  );
  const dataGridFullScreenButtonOld = document.querySelector(
    '[data-test-subj="dataGridFullScreenButton"]'
  );
  const dataGridFullScreenButton = dataGridFullScreenButtonNew || dataGridFullScreenButtonOld;
  if (dataGridIsFullScreen !== isExpanded && dataGridFullScreenButton) {
    dataGridFullScreenButton.dispatchEvent(clickEvent);
  }
};

interface GlobalFullScreen {
  globalFullScreen: boolean;
  setGlobalFullScreen: (fullScreen: boolean) => void;
}

interface TimelineFullScreen {
  timelineFullScreen: boolean;
  setTimelineFullScreen: (fullScreen: boolean) => void;
}

export const useGlobalFullScreen = (): GlobalFullScreen => {
  const dispatch = useDispatch();
  const globalFullScreen =
    useShallowEqualSelector(inputsSelectors.globalFullScreenSelector) ?? false;
  const setGlobalFullScreen = useCallback(
    (fullScreen: boolean) => {
      if (fullScreen) {
        setDataGridFullScreen(true);
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME);
        resetScroll();
      } else {
        setDataGridFullScreen(false);
        document.body.classList.remove(SCROLLING_DISABLED_CLASS_NAME);
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
      if (fullScreen) {
        setDataGridFullScreen(true);
      } else {
        setDataGridFullScreen(false);
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

export const useIsDataGridExpanded = () => {
  const [isDataGridExpanded, setDataGridExpanded] = useState(false);
  const onMutation = useCallback(() => {
    const isExpanded = document.querySelector('.euiDataGrid--fullScreen') !== null;
    setDataGridExpanded(isExpanded);
  }, [setDataGridExpanded]);
  return useMemo(() => {
    return { onMutation, isDataGridExpanded };
  }, [onMutation, isDataGridExpanded]);
};
