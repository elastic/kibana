/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { matchPath } from 'react-router-dom';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { ALERTS_PATH, RULES_PATH, UEBA_PATH } from '../../../../common/constants';
import { TimelineId } from '../../../../common';
import { useDeepEqualSelector } from '../../hooks/use_selector';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();
  const initialTimelineSourcerer = useRef(true);
  const initialDetectionSourcerer = useRef(true);
  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();
  const getConfigIndexPatternsSelector = useMemo(
    () => sourcererSelectors.configIndexPatternsSelector(),
    []
  );
  const ConfigIndexPatterns = useDeepEqualSelector(getConfigIndexPatternsSelector);

  const getSignalIndexNameSelector = useMemo(
    () => sourcererSelectors.signalIndexNameSelector(),
    []
  );
  const signalIndexNameSelector = useDeepEqualSelector(getSignalIndexNameSelector);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );

  useIndexFields(scopeId);
  useIndexFields(SourcererScopeName.timeline);

  useEffect(() => {
    if (!loadingSignalIndex && signalIndexName != null && signalIndexNameSelector == null) {
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [dispatch, loadingSignalIndex, signalIndexName, signalIndexNameSelector]);

  // Related to timeline
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSelector == null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: [...ConfigIndexPatterns, signalIndexName],
        })
      );
    } else if (
      signalIndexNameSelector != null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: [...ConfigIndexPatterns, signalIndexNameSelector],
        })
      );
    }
  }, [
    activeTimeline,
    ConfigIndexPatterns,
    dispatch,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSelector,
  ]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null &&
      initialDetectionSourcerer.current
    ) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: [signalIndexName],
        })
      );
    } else if (
      scopeId === SourcererScopeName.detections &&
      signalIndexNameSelector != null &&
      initialTimelineSourcerer.current
    ) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: [signalIndexNameSelector],
        })
      );
    }
  }, [dispatch, isSignalIndexExists, scopeId, signalIndexName, signalIndexNameSelector]);
};

export const useSourcererScope = (scope: SourcererScopeName = SourcererScopeName.default) => {
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  return useDeepEqualSelector((state) => sourcererScopeSelector(state, scope));
};

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections => {
  return matchPath(pathname, {
    path: [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${UEBA_PATH}/:id`],
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;
};
