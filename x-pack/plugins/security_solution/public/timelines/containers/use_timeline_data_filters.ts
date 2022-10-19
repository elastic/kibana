/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../../common/components/super_date_picker/selectors';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { useSourcererDataView, getScopeFromPath } from '../../common/containers/sourcerer';

export function useTimelineDataFilters(isActiveTimelines: boolean) {
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);
  const isActive = useMemo(() => isActiveTimelines === true, [isActiveTimelines]);

  const shouldUpdate = useDeepEqualSelector((state) => {
    if (isActive) {
      return getIsLoadingSelector(state.inputs.timeline);
    } else {
      return getIsLoadingSelector(state.inputs.global);
    }
  });
  const from = useDeepEqualSelector((state) => {
    if (isActive) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isActive) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });

  const { pathname } = useLocation();
  const { selectedPatterns: nonTimelinePatterns } = useSourcererDataView(
    getScopeFromPath(pathname)
  );

  const { selectedPatterns: timelinePatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const selectedPatterns = useMemo(() => {
    return isActiveTimelines ? timelinePatterns : nonTimelinePatterns;
  }, [isActiveTimelines, timelinePatterns, nonTimelinePatterns]);

  return {
    selectedPatterns,
    from,
    to,
    shouldUpdate,
  };
}
