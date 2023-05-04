/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeader, EuiSuperDatePicker, OnRefreshChangeProps } from '@elastic/eui';
import React, { useContext, useCallback, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { useMonitoringTimeContainerContext } from '../../application/hooks/use_monitoring_time';
import { GlobalStateContext } from '../../application/contexts/global_state_context';
import { Legacy } from '../../legacy_shims';
import { MonitoringStartServices } from '../../types';
interface MonitoringToolbarProps {
  pageTitle?: string;
  onRefresh?: () => void;
}

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

export const MonitoringToolbar: React.FC<MonitoringToolbarProps> = ({ pageTitle, onRefresh }) => {
  const { services } = useKibana<MonitoringStartServices>();

  const timePickerQuickRanges = services.uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  const {
    currentTimerange,
    handleTimeChange,
    setRefreshInterval,
    refreshInterval,
    setIsPaused,
    isPaused,
    isDisabled,
  } = useMonitoringTimeContainerContext();
  const state = useContext(GlobalStateContext);

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }
      handleTimeChange(selectedTime.start, selectedTime.end);
    },
    [handleTimeChange]
  );

  const onRefreshChange = useCallback(
    ({ refreshInterval: ri, isPaused: isP }: OnRefreshChangeProps) => {
      setRefreshInterval(ri);
      setIsPaused(isP);
      state.refreshInterval = {
        pause: isP,
        value: ri,
      };
      Legacy.shims.timefilter.setRefreshInterval(state.refreshInterval);
      state.save?.();
    },
    [setRefreshInterval, setIsPaused, state]
  );

  return (
    <EuiPageHeader
      pageTitle={pageTitle}
      rightSideItems={[
        <EuiSuperDatePicker
          isDisabled={isDisabled}
          start={currentTimerange.from}
          end={currentTimerange.to}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          isPaused={isPaused}
          refreshInterval={refreshInterval}
          onRefreshChange={onRefreshChange}
          commonlyUsedRanges={commonlyUsedRanges}
        />,
      ]}
    />
  );
};
