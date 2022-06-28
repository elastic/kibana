/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo } from 'react';
import dateMath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DurationRange, OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../../../../common/constants';

export interface DateRangePickerValues {
  autoRefreshOptions: {
    enabled: boolean;
    duration: number;
  };
  startDate?: string;
  endDate?: string;
  recentlyUsedDateRanges: EuiSuperDatePickerRecentRange[];
}
interface Range {
  from: string;
  to: string;
  display: string;
}

const DatePickerWrapper = euiStyled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;
const StickyFlexItem = euiStyled(EuiFlexItem).attrs({ grow: false })`
  background: ${(props) => `${props.theme.eui.euiHeaderBackgroundColor}`};
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${(props) => `${props.theme.eui.euiSizeL}`};
  padding-left: ${(props) => `${props.theme.eui.euiSizeM}`};
`;

export const ActionListDateRangePicker = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
  }) => {
    const { uiSettings } = useKibana().services;
    const [quickRanges] = useUiSetting$<Range[]>(DEFAULT_TIMEPICKER_QUICK_RANGES);
    const [dateFormat] = useState(() => uiSettings?.get('dateFormat'));
    const commonlyUsedRanges = !quickRanges.length
      ? []
      : quickRanges.map(({ from, to, display }) => ({
          start: from,
          end: to,
          label: display,
        }));

    const end = useMemo(
      () =>
        dateRangePickerState.endDate
          ? dateMath.parse(dateRangePickerState.endDate)?.toISOString()
          : undefined,
      [dateRangePickerState]
    );

    const start = useMemo(
      () =>
        dateRangePickerState.startDate
          ? dateMath.parse(dateRangePickerState.startDate)?.toISOString()
          : undefined,
      [dateRangePickerState]
    );

    return (
      <StickyFlexItem>
        <EuiFlexGroup justifyContent="flexStart" responsive>
          <DatePickerWrapper data-test-subj="actionListSuperDatePicker">
            <EuiFlexItem>
              <EuiSuperDatePicker
                updateButtonProps={{ iconOnly: true, fill: false }}
                isLoading={isDataLoading}
                dateFormat={dateFormat}
                commonlyUsedRanges={commonlyUsedRanges}
                end={end}
                isPaused={!dateRangePickerState.autoRefreshOptions.enabled}
                onTimeChange={onTimeChange}
                onRefreshChange={onRefreshChange}
                refreshInterval={dateRangePickerState.autoRefreshOptions.duration}
                onRefresh={onRefresh}
                recentlyUsedRanges={dateRangePickerState.recentlyUsedDateRanges}
                start={start}
              />
            </EuiFlexItem>
          </DatePickerWrapper>
        </EuiFlexGroup>
      </StickyFlexItem>
    );
  }
);

ActionListDateRangePicker.displayName = 'ActionListDateRangePicker';
