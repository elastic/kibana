/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type {
  EuiSuperDatePickerProps,
  EuiSuperDatePickerRecentRange,
  EuiSuperUpdateButtonProps,
  OnRefreshChangeProps,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { EuiSuperDatePicker } from '@elastic/eui';
import { getOr, isEmpty, take } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import deepEqual from 'fast-deep-equal';

import { isQueryInput } from '../../store/inputs/helpers';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../common/constants';
import { timelineActions } from '../../../timelines/store';
import { useUiSetting$ } from '../../lib/kibana';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { InputsModelId } from '../../store/inputs/constants';
import {
  durationSelector,
  endSelector,
  fromStrSelector,
  isLoadingSelector,
  kindSelector,
  kqlQuerySelector,
  policySelector,
  queriesSelector,
  startSelector,
  toStrSelector,
} from './selectors';
import type { Inputs } from '../../store/inputs/model';

const refreshButtonProps: EuiSuperUpdateButtonProps = {
  fill: false,
};

const MAX_RECENTLY_USED_RANGES = 9;

interface Range {
  from: string;
  to: string;
  display: string;
}

export interface UpdateReduxTime extends OnTimeChangeProps {
  id: InputsModelId;
  /** Indicates that the range has changed which fires additional actions */
  hasRangeChanged: boolean;
  kql?: inputsModel.GlobalKqlQuery | undefined;
  timelineId?: string;
}

export interface ReturnUpdateReduxTime {
  kqlHaveBeenUpdated: boolean;
}

export type DispatchUpdateReduxTime = ({
  end,
  id,
  isQuickSelection,
  kql,
  start,
  timelineId,
}: UpdateReduxTime) => ReturnUpdateReduxTime;

interface OwnProps {
  disabled?: boolean;
  id: InputsModelId;
  showUpdateButton?: boolean | 'iconOnly';
  timelineId?: string;
  width?: EuiSuperDatePickerProps['width'];
  compressed?: EuiSuperDatePickerProps['compressed'];
}

export type SuperDatePickerProps = OwnProps & PropsFromRedux;

const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
  newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
};

export const SuperDatePickerComponent = React.memo<SuperDatePickerProps>(
  ({
    duration,
    end,
    fromStr,
    id,
    isLoading,
    kqlQuery,
    policy,
    queries,
    setDuration,
    showUpdateButton = true,
    start,
    startAutoReload,
    stopAutoReload,
    timelineId,
    toStr,
    updateReduxTime,
    disabled,
    width = 'restricted',
    compressed = false,
  }) => {
    const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<EuiSuperDatePickerRecentRange[]>(
      []
    );
    const onRefresh = useCallback(
      ({ start: newStart, end: newEnd }: OnRefreshProps): void => {
        const isQuickSelection = newStart.includes('now') || newEnd.includes('now');
        const { kqlHaveBeenUpdated } = updateReduxTime({
          end: newEnd,
          id,
          isInvalid: false,
          isQuickSelection,
          kql: kqlQuery,
          start: newStart,
          timelineId,
          hasRangeChanged: false,
        });
        const currentStart = formatDate(newStart);
        const currentEnd = isQuickSelection
          ? formatDate(newEnd, { roundUp: true })
          : formatDate(newEnd);
        if (
          queries &&
          !kqlHaveBeenUpdated &&
          (!isQuickSelection || (start === currentStart && end === currentEnd))
        ) {
          refetchQuery(queries);
        }
      },
      [end, id, kqlQuery, queries, start, timelineId, updateReduxTime]
    );

    const onRefreshChange = useCallback(
      ({ isPaused, refreshInterval }: OnRefreshChangeProps): void => {
        const isQuickSelection =
          (fromStr != null && fromStr.includes('now')) || (toStr != null && toStr.includes('now'));
        if (duration !== refreshInterval) {
          setDuration({ id, duration: refreshInterval });
        }

        if (isPaused && policy === 'interval') {
          stopAutoReload({ id });
        } else if (!isPaused && policy === 'manual') {
          startAutoReload({ id });
        }

        if (queries && !isPaused && (!isQuickSelection || (isQuickSelection && toStr !== 'now'))) {
          refetchQuery(queries);
        }
      },
      [fromStr, toStr, duration, policy, setDuration, id, stopAutoReload, startAutoReload, queries]
    );

    const onTimeChange = useCallback(
      ({ start: newStart, end: newEnd, isInvalid }: OnTimeChangeProps) => {
        const isQuickSelection = newStart.includes('now') || newEnd.includes('now');
        if (!isInvalid) {
          updateReduxTime({
            end: newEnd,
            id,
            isInvalid,
            isQuickSelection,
            kql: kqlQuery,
            start: newStart,
            timelineId,
            hasRangeChanged: true,
          });
          const newRecentlyUsedRanges = [
            { start: newStart, end: newEnd },
            ...take(
              MAX_RECENTLY_USED_RANGES,
              recentlyUsedRanges.filter(
                (recentlyUsedRange) =>
                  !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
              )
            ),
          ];

          setRecentlyUsedRanges(newRecentlyUsedRanges);
        }
      },
      [updateReduxTime, id, kqlQuery, timelineId, recentlyUsedRanges]
    );

    const endDate = toStr != null ? toStr : new Date(end).toISOString();
    const startDate = fromStr != null ? fromStr : new Date(start).toISOString();

    const [quickRanges] = useUiSetting$<Range[]>(DEFAULT_TIMEPICKER_QUICK_RANGES);
    const commonlyUsedRanges = isEmpty(quickRanges)
      ? []
      : quickRanges.map(({ from, to, display }) => ({
          start: from,
          end: to,
          label: display,
        }));

    return (
      <EuiSuperDatePicker
        commonlyUsedRanges={commonlyUsedRanges}
        end={endDate}
        isLoading={isLoading}
        isPaused={policy === 'manual'}
        onRefresh={onRefresh}
        onRefreshChange={onRefreshChange}
        onTimeChange={onTimeChange}
        recentlyUsedRanges={recentlyUsedRanges}
        refreshInterval={duration}
        showUpdateButton={showUpdateButton}
        start={startDate}
        isDisabled={disabled}
        width={width}
        compressed={compressed}
        updateButtonProps={refreshButtonProps}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.duration === nextProps.duration &&
    prevProps.end === nextProps.end &&
    prevProps.fromStr === nextProps.fromStr &&
    prevProps.id === nextProps.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.policy === nextProps.policy &&
    prevProps.setDuration === nextProps.setDuration &&
    prevProps.start === nextProps.start &&
    prevProps.startAutoReload === nextProps.startAutoReload &&
    prevProps.stopAutoReload === nextProps.stopAutoReload &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.toStr === nextProps.toStr &&
    prevProps.updateReduxTime === nextProps.updateReduxTime &&
    deepEqual(prevProps.kqlQuery, nextProps.kqlQuery) &&
    deepEqual(prevProps.queries, nextProps.queries)
);

export const formatDate = (
  date: string,
  options?: {
    roundUp?: boolean;
  }
): string => {
  const momentDate = dateMath.parse(date, options);
  return momentDate != null && momentDate.isValid() ? momentDate.toISOString() : '';
};

export const dispatchUpdateReduxTime =
  (dispatch: Dispatch) =>
  ({
    end,
    id,
    isQuickSelection,
    kql,
    start,
    timelineId,
    hasRangeChanged,
  }: UpdateReduxTime): ReturnUpdateReduxTime => {
    const fromDate = formatDate(start);
    let toDate = formatDate(end, { roundUp: true });
    if (isQuickSelection) {
      if (end === start) {
        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            id,
            fromStr: start,
            toStr: end,
            from: fromDate,
            to: toDate,
          })
        );
      } else {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            id,
            fromStr: start,
            toStr: end,
            from: fromDate,
            to: toDate,
          })
        );
      }
    } else {
      toDate = formatDate(end);
      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          id,
          from: formatDate(start),
          to: formatDate(end),
        })
      );
    }
    if (timelineId != null && hasRangeChanged) {
      dispatch(
        timelineActions.updateRange({
          id: timelineId,
          start: fromDate,
          end: toDate,
        })
      );
    }
    if (kql && kql.refetch) {
      return {
        kqlHaveBeenUpdated: kql.refetch(dispatch) ?? false,
      };
    }

    return {
      kqlHaveBeenUpdated: false,
    };
  };

export const makeMapStateToProps = () => {
  const getDurationSelector = durationSelector();
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getKindSelector = kindSelector();
  const getKqlQuerySelector = kqlQuerySelector();
  const getPolicySelector = policySelector();
  const getQueriesSelector = queriesSelector();
  const getStartSelector = startSelector();
  const getToStrSelector = toStrSelector();
  return (state: State, { id }: OwnProps) => {
    const inputsRange: Inputs = getOr({}, `inputs.${id}`, state);
    return {
      duration: getDurationSelector(inputsRange),
      end: getEndSelector(inputsRange),
      fromStr: getFromStrSelector(inputsRange),
      kind: getKindSelector(inputsRange),
      policy: getPolicySelector(inputsRange),
      start: getStartSelector(inputsRange),
      toStr: getToStrSelector(inputsRange),
      isLoading: false,
      ...(isQueryInput(inputsRange) &&
        (id === InputsModelId.timeline || id === InputsModelId.global) && {
          isLoading: getIsLoadingSelector(inputsRange),
          kqlQuery: getKqlQuerySelector(inputsRange),
          queries: getQueriesSelector(state, id),
        }),
    };
  };
};

SuperDatePickerComponent.displayName = 'SuperDatePickerComponent';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  startAutoReload: ({ id }: { id: InputsModelId }) =>
    dispatch(inputsActions.startAutoReload({ id })),
  stopAutoReload: ({ id }: { id: InputsModelId }) => dispatch(inputsActions.stopAutoReload({ id })),
  setDuration: ({ id, duration }: { id: InputsModelId; duration: number }) =>
    dispatch(inputsActions.setDuration({ id, duration })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const SuperDatePicker = connector(SuperDatePickerComponent);
