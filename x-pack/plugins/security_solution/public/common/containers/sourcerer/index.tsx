/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../hooks/use_selector';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();

  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();
  const getConfigIndexPatternsSelector = useMemo(
    () => sourcererSelectors.configIndexPatternsSelector(),
    []
  );
  const ConfigIndexPatterns = useDeepEqualSelector(getConfigIndexPatternsSelector);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );

  useIndexFields(scopeId);
  useIndexFields(SourcererScopeName.timeline);

  useEffect(() => {
    if (!loadingSignalIndex && signalIndexName != null) {
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [dispatch, loadingSignalIndex, signalIndexName]);

  // Related to timeline
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      (activeTimeline == null || (activeTimeline != null && activeTimeline.savedObjectId == null))
    ) {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: [...ConfigIndexPatterns, signalIndexName],
        })
      );
    }
  }, [activeTimeline, ConfigIndexPatterns, dispatch, loadingSignalIndex, signalIndexName]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null
    ) {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: [signalIndexName],
        })
      );
    }
  }, [dispatch, isSignalIndexExists, scopeId, signalIndexName]);
};

export const useSourcererScope = (scope: SourcererScopeName = SourcererScopeName.default) => {
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const SourcererScope = useDeepEqualSelector((state) => sourcererScopeSelector(state, scope));
  return SourcererScope;
};
