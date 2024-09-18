/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../../common/components/super_date_picker/selectors';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { useSourcererDataView } from '../../sourcerer/containers';
import { getScopeFromPath } from '../../sourcerer/containers/sourcerer_paths';
import { sourcererSelectors } from '../../common/store';

export function useTimelineDataFilters(isActiveTimelines: boolean) {
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);
  const isDatePickerAndSourcererDisabled = useIsExperimentalFeatureEnabled(
    'analyzerDatePickersAndSourcererDisabled'
  );

  const shouldUpdate = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getIsLoadingSelector(state.inputs.timeline);
    } else {
      return getIsLoadingSelector(state.inputs.global);
    }
  });
  const from = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);
  const { pathname } = useLocation();
  const { selectedPatterns: nonTimelinePatterns } = useSourcererDataView(
    getScopeFromPath(pathname)
  );

  const { selectedPatterns: timelinePatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const selectedPatterns = useMemo(() => {
    return isActiveTimelines
      ? [...new Set([...timelinePatterns, ...defaultDataView.patternList])]
      : [...new Set([...nonTimelinePatterns, ...defaultDataView.patternList])];
  }, [isActiveTimelines, timelinePatterns, nonTimelinePatterns, defaultDataView.patternList]);

  const { selectedPatterns: analyzerPatterns } = useSourcererDataView(SourcererScopeName.analyzer);

  return useMemo(() => {
    return {
      selectedPatterns: isDatePickerAndSourcererDisabled ? selectedPatterns : analyzerPatterns,
      from,
      to,
      shouldUpdate,
    };
  }, [
    selectedPatterns,
    from,
    to,
    shouldUpdate,
    isDatePickerAndSourcererDisabled,
    analyzerPatterns,
  ]);
}
