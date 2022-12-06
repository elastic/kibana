/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import type { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useActionHistoryUrlParams } from './use_action_history_url_params';

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
  padding-bottom: ${(props) => `${props.theme.eui.euiSizeL}`};
`;

export const ActionLogDateRangePicker = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    isFlyout,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    isFlyout: boolean;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
  }) => {
    const { startDate: startDateFromUrl, endDate: endDateFromUrl } = useActionHistoryUrlParams();
    const getTestId = useTestIdGenerator('response-actions-list');
    const kibana = useKibana<IUnifiedSearchPluginServices>();
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
      <DatePickerWrapper data-test-subj={getTestId('super-date-picker')}>
        <EuiFlexGroup alignItems="center" direction="row" responsive={false} gutterSize="s">
          <EuiFlexItem>
            <EuiSuperDatePicker
              isLoading={isDataLoading}
              dateFormat={uiSettings.get('dateFormat')}
              commonlyUsedRanges={commonlyUsedRanges}
              end={
                isFlyout
                  ? dateRangePickerState.endDate
                  : endDateFromUrl ?? dateRangePickerState.endDate
              }
              isPaused={!dateRangePickerState.autoRefreshOptions.enabled}
              onTimeChange={onTimeChange}
              onRefreshChange={onRefreshChange}
              refreshInterval={dateRangePickerState.autoRefreshOptions.duration}
              onRefresh={onRefresh}
              recentlyUsedRanges={dateRangePickerState.recentlyUsedDateRanges}
              start={
                isFlyout
                  ? dateRangePickerState.startDate
                  : startDateFromUrl ?? dateRangePickerState.startDate
              }
              showUpdateButton={false}
              updateButtonProps={{ iconOnly: true, fill: false }}
              width="auto"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </DatePickerWrapper>
    );
  }
);

ActionLogDateRangePicker.displayName = 'ActionLogDateRangePicker';
