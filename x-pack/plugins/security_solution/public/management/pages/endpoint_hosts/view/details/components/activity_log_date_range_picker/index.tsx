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
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';

import { useEndpointSelector } from '../../../hooks';
import { getActivityLogDataPaging } from '../../../../store/selectors';

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  background: white;
`;
const StickyFlexItem = styled(EuiFlexItem)`
  max-width: 350px;
  position: sticky;
  top: ${(props) => props.theme.eui.euiSizeM};
  z-index: 1;
  padding: ${(props) => `0 ${props.theme.eui.paddingSizes.m}`};
`;

export const DateRangePicker = memo(() => {
  const dispatch = useDispatch();
  const { page, pageSize, startDate, endDate, autoRefreshOptions } = useEndpointSelector(
    getActivityLogDataPaging
  );

  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<
    Array<{ start: string; end: string }>
  >([]);
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
    ({ start, end }) => {
      const recentlyUsedRange = recentlyUsedRanges.filter((e) => {
        const isDuplicate = e.start === start && e.end === end;
        return !isDuplicate;
      });
      recentlyUsedRange.unshift({ start, end });
      setRecentlyUsedRanges(
        recentlyUsedRange.length > 10 ? recentlyUsedRange.slice(0, 9) : recentlyUsedRange
      );
      setIsLoading(true);
      startLoading();
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: start ? dateMath.parse(start)?.toISOString() : undefined,
          endDate: end ? dateMath.parse(end)?.toISOString() : undefined,
        },
      });
    },
    [dispatch, page, pageSize, recentlyUsedRanges, startLoading]
  );

  return (
    <StickyFlexItem grow={false}>
      <EuiFlexGroup justifyContent="flexEnd" responsive>
        <DatePickerWrapper data-test-subj="activityLogSuperDatePicker">
          <EuiFlexItem>
            <EuiSuperDatePicker
              end={dateMath.parse(endDate)?.toISOString()}
              isLoading={isLoading}
              isPaused={!autoRefreshOptions.enabled}
              onTimeChange={onTimeChange}
              onRefreshChange={onRefreshChange}
              refreshInterval={autoRefreshOptions.duration}
              onRefresh={onRefresh}
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
