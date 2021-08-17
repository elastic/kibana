/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import dateMath from '@elastic/datemath';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiSuperDatePickerRecentRange,
} from '@elastic/eui';

import { useEndpointSelector } from '../../../hooks';
import { getActivityLogDataPaging } from '../../../../store/selectors';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../../../../../common/constants';
import { useUiSetting$ } from '../../../../../../../../public/common/lib/kibana';

interface Range {
  from: string;
  to: string;
  display: string;
}

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  max-width: 250px;
`;
const StickyFlexItem = styled(EuiFlexItem)`
  background: white;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${(props) => `${props.theme.eui.paddingSizes.m}`};
`;

export const DateRangePicker = memo(() => {
  const dispatch = useDispatch();
  const { page, pageSize, startDate, endDate, autoRefreshOptions } = useEndpointSelector(
    getActivityLogDataPaging
  );

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<EuiSuperDatePickerRecentRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  const startLoading = useCallback(() => {
    setTimeout(stopLoading, 1000);
  }, [stopLoading]);

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
      const newRecentlyUsedRanges = [
        { start: newStart, end: newEnd },
        ...recentlyUsedRanges
          .filter(
            (recentlyUsedRange) =>
              !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
          )
          .slice(0, 9),
      ];
      recentlyUsedRanges.unshift({ start: newStart, end: newEnd });
      setRecentlyUsedRanges(newRecentlyUsedRanges);

      setIsLoading(true);
      startLoading();
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: newStart ? dateMath.parse(newStart)?.toISOString() : undefined,
          endDate: newEnd ? dateMath.parse(newEnd)?.toISOString() : undefined,
        },
      });
    },
    [dispatch, page, pageSize, recentlyUsedRanges, startLoading]
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
              commonlyUsedRanges={commonlyUsedRanges}
              end={dateMath.parse(endDate)?.toISOString()}
              isLoading={isLoading}
              isPaused={!autoRefreshOptions.enabled}
              onTimeChange={onTimeChange}
              onRefreshChange={onRefreshChange}
              refreshInterval={autoRefreshOptions.duration}
              onRefresh={onRefresh}
              recentlyUsedRanges={recentlyUsedRanges}
              start={dateMath.parse(startDate)?.toISOString()}
              showUpdateButton={false}
            />
          </EuiFlexItem>
        </DatePickerWrapper>
      </EuiFlexGroup>
    </StickyFlexItem>
  );
});

DateRangePicker.displayName = 'DateRangePicker';
