/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import dateMath from '@elastic/datemath';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiSuperDatePickerRecentRange,
} from '@elastic/eui';

import { useEndpointSelector } from '../../../hooks';
import {
  getActivityLogDataPaging,
  getActivityLogRequestLoading,
} from '../../../../store/selectors';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../../../../../common/constants';
import { useUiSetting$ } from '../../../../../../../common/lib/kibana';

interface Range {
  from: string;
  to: string;
  display: string;
}

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;
const StickyFlexItem = styled(EuiFlexItem)`
  background: ${(props) => `${props.theme.eui.euiHeaderBackgroundColor}`};
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${(props) => `${props.theme.eui.paddingSizes.m}`};
`;

export const DateRangePicker = memo(() => {
  const dispatch = useDispatch();
  const { page, pageSize, startDate, endDate, autoRefreshOptions, recentlyUsedDateRanges } =
    useEndpointSelector(getActivityLogDataPaging);

  const activityLogLoading = useEndpointSelector(getActivityLogRequestLoading);

  const dispatchActionUpdateActivityLogPaging = useCallback(
    async ({ start, end }) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: dateMath.parse(start)?.toISOString(),
          endDate: dateMath.parse(end)?.toISOString(),
        },
      });
    },
    [dispatch, page, pageSize]
  );

  const onRefreshChange = useCallback(
    (evt) => {
      dispatch({
        type: 'userUpdatedActivityLogRefreshOptions',
        payload: {
          autoRefreshOptions: { enabled: !evt.isPaused, duration: evt.refreshInterval },
        },
      });
    },
    [dispatch]
  );

  const onRefresh = useCallback(() => {
    dispatch({
      type: 'endpointDetailsActivityLogUpdatePaging',
      payload: {
        disabled: false,
        page,
        pageSize,
        startDate,
        endDate,
      },
    });
  }, [dispatch, page, pageSize, startDate, endDate]);

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd }) => {
      const newRecentlyUsedDateRanges = [
        { start: newStart, end: newEnd },
        ...recentlyUsedDateRanges
          .filter(
            (recentlyUsedRange) =>
              !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
          )
          .slice(0, 9),
      ];
      dispatch({
        type: 'userUpdatedActivityLogRecentlyUsedDateRanges',
        payload: newRecentlyUsedDateRanges,
      });

      dispatchActionUpdateActivityLogPaging({ start: newStart, end: newEnd });
    },
    [dispatch, recentlyUsedDateRanges, dispatchActionUpdateActivityLogPaging]
  );

  const [quickRanges] = useUiSetting$<Range[]>(DEFAULT_TIMEPICKER_QUICK_RANGES);
  const commonlyUsedRanges = !quickRanges.length
    ? []
    : quickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      }));

  return (
    <StickyFlexItem grow={false}>
      <EuiFlexGroup justifyContent="flexStart" responsive>
        <DatePickerWrapper data-test-subj="activityLogSuperDatePicker">
          <EuiFlexItem>
            <EuiSuperDatePicker
              isLoading={activityLogLoading}
              commonlyUsedRanges={commonlyUsedRanges}
              end={dateMath.parse(endDate)?.toISOString()}
              isPaused={!autoRefreshOptions.enabled}
              onTimeChange={onTimeChange}
              onRefreshChange={onRefreshChange}
              refreshInterval={autoRefreshOptions.duration}
              onRefresh={onRefresh}
              recentlyUsedRanges={recentlyUsedDateRanges as EuiSuperDatePickerRecentRange[]}
              start={dateMath.parse(startDate)?.toISOString()}
            />
          </EuiFlexItem>
        </DatePickerWrapper>
      </EuiFlexGroup>
    </StickyFlexItem>
  );
});

DateRangePicker.displayName = 'DateRangePicker';
