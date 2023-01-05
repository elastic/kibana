/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useDeepEqualSelector } from './use_selector';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../components/super_date_picker/selectors';
import { SourcererScopeName } from '../store/sourcerer/model';
import { useSourcererDataView, getScopeFromPath } from '../containers/sourcerer';
import { sourcererSelectors } from '../store';

export function useGlobalOrTimelineFilters(isTimeline: boolean) {
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);

  const shouldUpdate = useDeepEqualSelector((state) => {
    if (isTimeline) {
      return getIsLoadingSelector(state.inputs.timeline);
    } else {
      return getIsLoadingSelector(state.inputs.global);
    }
  });
  const from = useDeepEqualSelector((state) => {
    if (isTimeline) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isTimeline) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });
  const getDefaultDataViewSelector = useMemo(
    () => sourcererSelectors.defaultDataViewSelector(),
    []
  );
  const defaultDataView = useDeepEqualSelector(getDefaultDataViewSelector);
  const { pathname } = useLocation();
  const { selectedPatterns: nonTimelinePatterns } = useSourcererDataView(
    getScopeFromPath(pathname)
  );

  const { selectedPatterns: timelinePatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const selectedPatterns = useMemo(() => {
    return isTimeline
      ? [...new Set([...timelinePatterns, ...defaultDataView.patternList])]
      : [...new Set([...nonTimelinePatterns, ...defaultDataView.patternList])];
  }, [isTimeline, timelinePatterns, nonTimelinePatterns, defaultDataView.patternList]);

  return {
    selectedPatterns,
    from,
    to,
    shouldUpdate,
  };
}
