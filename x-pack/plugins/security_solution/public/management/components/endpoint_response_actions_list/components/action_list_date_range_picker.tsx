/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DurationRange, OnRefreshChangeProps } from '@elastic/eui/src/components/date_picker/types';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

export interface DateRangePickerValues {
  autoRefreshOptions: {
    enabled: boolean;
    duration: number;
  };
  startDate: string;
  endDate: string;
  recentlyUsedDateRanges: EuiSuperDatePickerRecentRange[];
}

const DatePickerWrapper = euiStyled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  padding-bottom: ${(props) => `${props.theme.eui.euiCodeBlockPaddingModifiers.paddingLarge}`};
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
    const kibana = useKibana<IDataPluginServices>();
    const { uiSettings } = kibana.services;
    const [commonlyUsedRanges] = useState(() => {
      return (
        uiSettings
          ?.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
          ?.map(({ from, to, display }: { from: string; to: string; display: string }) => {
            return {
              start: from,
              end: to,
              label: display,
            };
          }) ?? []
      );
    });

    return (
      <DatePickerWrapper data-test-subj="actionListSuperDatePicker">
        <EuiSuperDatePicker
          isLoading={isDataLoading}
          dateFormat={uiSettings.get('dateFormat')}
          commonlyUsedRanges={commonlyUsedRanges}
          end={dateRangePickerState.endDate}
          isPaused={!dateRangePickerState.autoRefreshOptions.enabled}
          onTimeChange={onTimeChange}
          onRefreshChange={onRefreshChange}
          refreshInterval={dateRangePickerState.autoRefreshOptions.duration}
          onRefresh={onRefresh}
          recentlyUsedRanges={dateRangePickerState.recentlyUsedDateRanges}
          start={dateRangePickerState.startDate}
          updateButtonProps={{ iconOnly: true, fill: false }}
          width="auto"
        />
      </DatePickerWrapper>
    );
  }
);

ActionListDateRangePicker.displayName = 'ActionListDateRangePicker';
