/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InputsModelId } from '../../common/store/inputs/constants';
import { defaultHeaders } from '../components/timeline/body/column_headers/default_headers';
import { timelineActions } from '../store';
import { useTimelineFullScreen } from '../../common/containers/use_full_screen';
import { TimelineId } from '../../../common/types/timeline';
import type { TimelineTypeLiteral } from '../../../common/api/timeline';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../common/store/inputs';
import { sourcererActions, sourcererSelectors } from '../../common/store/sourcerer';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { appActions } from '../../common/store/app';
import type { TimeRange } from '../../common/store/inputs/model';
import { useDiscoverInTimelineContext } from '../../common/components/discover_in_timeline/use_discover_in_timeline_context';

export interface UseCreateTimelineParams {
  /**
   * Id of the timeline
   */
  timelineId: string;
  /**
   * Type of the timeline (default, template)
   */
  timelineType: TimelineTypeLiteral;
  /**
   * Callback to be called when the timeline is created
   */
  onClick?: () => void;
}

/**
 * Creates a new empty timeline for the given id and type.
 * Can be used to create new timelines or to reset timeline state.
 * It allows a callback to be passed in to be called when the timeline is created.
 */
export const useCreateTimeline = ({
  timelineId,
  timelineType,
  onClick,
}: UseCreateTimelineParams): ((options?: { timeRange?: TimeRange }) => Promise<void>) => {
  const dispatch = useDispatch();
  const { id: dataViewId, patternList: selectedPatterns } = useSelector(
    sourcererSelectors.defaultDataView
  ) ?? { id: '', patternList: [] };

  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const globalTimeRange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);

  const { resetDiscoverAppState } = useDiscoverInTimelineContext();

  const createTimeline = useCallback(
    ({ id, show, timeRange: timeRangeParam }) => {
      const timerange = timeRangeParam ?? globalTimeRange;

      if (id === TimelineId.active && timelineFullScreen) {
        setTimelineFullScreen(false);
      }
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: dataViewId,
          selectedPatterns,
        })
      );
      dispatch(
        timelineActions.createTimeline({
          columns: defaultHeaders,
          dataViewId,
          id,
          indexNames: selectedPatterns,
          show,
          timelineType,
          updated: undefined,
        })
      );

      dispatch(inputsActions.addLinkTo([InputsModelId.global, InputsModelId.timeline]));
      dispatch(appActions.addNotes({ notes: [] }));

      if (timeRangeParam) {
        dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
      }

      if (timerange?.kind === 'absolute') {
        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      } else if (timerange?.kind === 'relative') {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...timerange,
            id: InputsModelId.timeline,
          })
        );
      }
    },
    [
      dispatch,
      globalTimeRange,
      dataViewId,
      selectedPatterns,
      setTimelineFullScreen,
      timelineFullScreen,
      timelineType,
    ]
  );

  return useCallback(
    async (options?: { timeRange?: TimeRange }) => {
      await resetDiscoverAppState();
      createTimeline({ id: timelineId, show: true, timelineType, timeRange: options?.timeRange });
      if (typeof onClick === 'function') {
        onClick();
      }
    },
    [createTimeline, timelineId, timelineType, onClick, resetDiscoverAppState]
  );
};
