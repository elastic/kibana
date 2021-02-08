/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { SelectedPatterns, SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
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
  const configIndexPatternsWithId: SelectedPatterns = useMemo(
    () => ConfigIndexPatterns.map((title) => ({ id: 'config', title })),
    [ConfigIndexPatterns]
  );

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
          selectedPatterns: [
            ...configIndexPatternsWithId,
            { id: 'detections', title: signalIndexName },
          ],
        })
      );
    } else if (signalIndexNameSelector != null && initialTimelineSourcerer.current) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: [
            ...configIndexPatternsWithId,
            { id: 'detections', title: signalIndexNameSelector },
          ],
        })
      );
    }
  }, [
    activeTimeline,
    configIndexPatternsWithId,
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
          selectedPatterns: [{ id: 'detections', title: signalIndexName }],
        })
      );
    } else if (signalIndexNameSelector != null && initialTimelineSourcerer.current) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: [{ id: 'detections', title: signalIndexNameSelector }],
        })
      );
    }
  }, [dispatch, isSignalIndexExists, scopeId, signalIndexName, signalIndexNameSelector]);
};

export const useSourcererScope = (scope: SourcererScopeName = SourcererScopeName.default) => {
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const SourcererScope = useDeepEqualSelector((state) => sourcererScopeSelector(state, scope));
  return SourcererScope;
};
