/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import styled from 'styled-components';
import dateMath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { DurationRange, OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';
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

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;
const StickyFlexItem = styled(EuiFlexItem)`
  background: ${(props) => `${props.theme.eui.euiHeaderBackgroundColor}`};
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${(props) => `${props.theme.eui.euiSizeL}`};
  padding-left: ${(props) => `${props.theme.eui.euiSizeM}`};
`;

export const ActionListDateRangePicker = memo(
  ({
    dateRangePickerStorage,
    isDataLoading,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerStorage: DateRangePickerValues;
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

    return (
      <StickyFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexStart" responsive>
          <DatePickerWrapper data-test-subj="activityLogSuperDatePicker">
            <EuiFlexItem>
              <EuiSuperDatePicker
                updateButtonProps={{ iconOnly: true, fill: false }}
                isLoading={isDataLoading}
                dateFormat={dateFormat}
                commonlyUsedRanges={commonlyUsedRanges}
                end={
                  dateRangePickerStorage.endDate
                    ? dateMath.parse(dateRangePickerStorage.endDate)?.toISOString()
                    : undefined
                }
                isPaused={!dateRangePickerStorage.autoRefreshOptions.enabled}
                onTimeChange={onTimeChange}
                onRefreshChange={onRefreshChange}
                refreshInterval={dateRangePickerStorage.autoRefreshOptions.duration}
                onRefresh={onRefresh}
                recentlyUsedRanges={dateRangePickerStorage.recentlyUsedDateRanges}
                start={
                  dateRangePickerStorage.startDate
                    ? dateMath.parse(dateRangePickerStorage.startDate)?.toISOString()
                    : undefined
                }
              />
            </EuiFlexItem>
          </DatePickerWrapper>
        </EuiFlexGroup>
      </StickyFlexItem>
    );
  }
);

ActionListDateRangePicker.displayName = 'ActionListDateRangePicker';
