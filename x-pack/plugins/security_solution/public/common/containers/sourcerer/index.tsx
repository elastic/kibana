/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEqual from 'lodash/isEqual';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { ManageScope, SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { State } from '../../store';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineModel } from '../../../timelines/store/timeline/model';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();

  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();
  const getConfigIndexPatternsSelector = useMemo(
    () => sourcererSelectors.configIndexPatternsSelector(),
    []
  );
  const ConfigIndexPatterns = useSelector(getConfigIndexPatternsSelector, isEqual);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useSelector<State, TimelineModel>(
    (state) => getTimelineSelector(state, TimelineId.active),
    isEqual
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
  const SourcererScope = useSelector<State, ManageScope>(
    (state) => sourcererScopeSelector(state, scope),
    deepEqual
  );
  return SourcererScope;
};
