/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { useMemo, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { sourcererSelectors } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { defaultHeaders } from './body/column_headers/default_headers';
import { timelineDefaults } from '../../store/timeline/defaults';
import { activeTimeline } from '../../containers/active_timeline_context';
import type { TimelineId } from '../../../../common/types/timeline';

export const useInitializeTimeline = ({ timelineId }: { timelineId: TimelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const scopeIdSelector = useMemo(() => sourcererSelectors.scopeIdSelector(), []);

  const {
    selectedPatterns: selectedPatternsSourcerer,
    selectedDataViewId: selectedDataViewIdSourcerer,
  } = useDeepEqualSelector((state) => scopeIdSelector(state, SourcererScopeName.timeline));
  const {
    dataViewId: selectedDataViewIdTimeline,
    indexNames: selectedPatternsTimeline,
    savedObjectId,
    initialized,
  } = useDeepEqualSelector((state) =>
    pick(
      ['indexNames', 'dataViewId', 'savedObjectId', 'initialized'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  useEffect(() => {
    if (!savedObjectId && !initialized) {
      dispatch(
        timelineActions.createTimeline({
          id: timelineId,
          columns: defaultHeaders,
          dataViewId: selectedDataViewIdSourcerer,
          indexNames: selectedPatternsSourcerer,
          expandedDetail: activeTimeline.getExpandedDetail(),
          show: false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSourcererChange = useCallback(() => {
    if (
      // timeline not initialized, so this must be initial state and not user change
      !savedObjectId ||
      selectedDataViewIdSourcerer == null ||
      // initial state will get set on create
      (selectedDataViewIdTimeline === null && selectedPatternsTimeline.length === 0) ||
      // don't update if no change
      (selectedDataViewIdTimeline === selectedDataViewIdSourcerer &&
        selectedPatternsTimeline.sort().join() === selectedPatternsSourcerer.sort().join())
    ) {
      return;
    }
    dispatch(
      timelineActions.updateDataView({
        dataViewId: selectedDataViewIdSourcerer,
        id: timelineId,
        indexNames: selectedPatternsSourcerer,
      })
    );
  }, [
    dispatch,
    savedObjectId,
    selectedDataViewIdSourcerer,
    selectedDataViewIdTimeline,
    selectedPatternsSourcerer,
    selectedPatternsTimeline,
    timelineId,
  ]);

  useEffect(() => {
    onSourcererChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewIdSourcerer, selectedPatternsSourcerer]);
};
