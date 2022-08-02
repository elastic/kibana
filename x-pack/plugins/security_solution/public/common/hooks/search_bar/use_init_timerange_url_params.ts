/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { get, isEmpty } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import type { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import type {
  AbsoluteTimeRange,
  LinkTo,
  RelativeTimeRange,
  UrlInputsModel,
} from '../../store/inputs/model';
import { normalizeTimeRange } from '../../utils/normalize_time_range';
import { inputsActions } from '../../store/inputs';
import { formatDate } from '../../components/super_date_picker';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';

export const useInitTimerangeFromUrlParam = () => {
  const dispatch = useDispatch();

  const onInitialize = useCallback(
    (initialState: UrlInputsModel | null) =>
      initializeTimerangeFromUrlParam(initialState, dispatch),
    [dispatch]
  );

  useInitializeUrlParam(URL_PARAM_KEY.timerange, onInitialize);
};

const initializeTimerangeFromUrlParam = (
  initialState: UrlInputsModel | null,
  dispatch: Dispatch
) => {
  if (initialState != null) {
    const globalId: InputsModelId = 'global';
    const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', initialState) };
    const globalType: TimeRangeKinds = get('global.timerange.kind', initialState);

    const timelineId: InputsModelId = 'timeline';
    const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', initialState) };
    const timelineType: TimeRangeKinds = get('timeline.timerange.kind', initialState);

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
          get('timeline.timerange', initialState)
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
          get('timeline.timerange', initialState)
        );

        // Updates date values when timerange is relative
        relativeRange.from = formatDate(relativeRange.fromStr);
        relativeRange.to = formatDate(relativeRange.toStr, {
          roundUp: true,
        });

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
          get('global.timerange', initialState)
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
          get('global.timerange', initialState)
        );

        // Updates date values when timerange is relative
        relativeRange.from = formatDate(relativeRange.fromStr);
        relativeRange.to = formatDate(relativeRange.toStr, {
          roundUp: true,
        });

        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...relativeRange,
            id: globalId,
          })
        );
      }
    }
  }
};
