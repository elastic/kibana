/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';
import type { Dispatch } from 'redux';

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { inputsActions } from '../../store/actions';
import type { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import type {
  UrlInputsModel,
  LinkTo,
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../store/inputs/model';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from './constants';
import { decodeRisonUrlState } from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import type { SetInitialStateFromUrl } from './types';
import {
  queryTimelineById,
  dispatchUpdateTimeline,
} from '../../../timelines/components/open_timeline/helpers';
import { timelineActions } from '../../../timelines/store/timeline';

export const useSetInitialStateFromUrl = () => {
  const dispatch = useDispatch();

  const updateTimeline = useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]);

  const updateTimelineIsLoading = useMemo(
    () => (status: { id: string; isLoading: boolean }) =>
      dispatch(timelineActions.updateIsLoading(status)),
    [dispatch]
  );

  const setInitialStateFromUrl = useCallback(
    ({ urlStateToUpdate }: SetInitialStateFromUrl) => {
      urlStateToUpdate.forEach(({ urlKey, newUrlStateString }) => {
        if (urlKey === CONSTANTS.timerange) {
          updateTimerange(newUrlStateString, dispatch);
        }

        if (urlKey === CONSTANTS.timeline) {
          const timeline = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
          if (timeline != null && timeline.id !== '') {
            queryTimelineById({
              activeTimelineTab: timeline.activeTab,
              duplicate: false,
              graphEventId: timeline.graphEventId,
              timelineId: timeline.id,
              openTimeline: timeline.isOpen,
              updateIsLoading: updateTimelineIsLoading,
              updateTimeline,
            });
          }
        }
      });
    },
    [dispatch, updateTimeline, updateTimelineIsLoading]
  );

  return Object.freeze({ setInitialStateFromUrl, updateTimeline, updateTimelineIsLoading });
};

const updateTimerange = (newUrlStateString: string, dispatch: Dispatch) => {
  const timerangeStateData = decodeRisonUrlState<UrlInputsModel>(newUrlStateString);

  const globalId: InputsModelId = 'global';
  const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
  const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);

  const timelineId: InputsModelId = 'timeline';
  const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
  const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);

  if (isEmpty(globalLinkTo.linkTo)) {
    dispatch(inputsActions.removeGlobalLinkTo());
  } else {
    dispatch(inputsActions.addGlobalLinkTo({ linkToId: 'timeline' }));
  }

  if (isEmpty(timelineLinkTo.linkTo)) {
    dispatch(inputsActions.removeTimelineLinkTo());
  } else {
    dispatch(inputsActions.addTimelineLinkTo({ linkToId: 'global' }));
  }

  if (timelineType) {
    if (timelineType === 'absolute') {
      const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
        get('timeline.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          ...absoluteRange,
          id: timelineId,
        })
      );
    }

    if (timelineType === 'relative') {
      const relativeRange = normalizeTimeRange<RelativeTimeRange>(
        get('timeline.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          ...relativeRange,
          id: timelineId,
        })
      );
    }
  }

  if (globalType) {
    if (globalType === 'absolute') {
      const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
        get('global.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          ...absoluteRange,
          id: globalId,
        })
      );
    }
    if (globalType === 'relative') {
      const relativeRange = normalizeTimeRange<RelativeTimeRange>(
        get('global.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          ...relativeRange,
          id: globalId,
        })
      );
    }
  }
};
