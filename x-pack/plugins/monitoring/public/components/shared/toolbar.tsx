/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiTitle,
  OnRefreshChangeProps,
} from '@elastic/eui';
import React, { useContext, useCallback } from 'react';
import { MonitoringTimeContainer } from '../../application/hooks/use_monitoring_time';
import { GlobalStateContext } from '../../application/contexts/global_state_context';
import { Legacy } from '../../legacy_shims';

interface MonitoringToolbarProps {
  pageTitle?: string;
  onRefresh?: () => void;
}

export const MonitoringToolbar: React.FC<MonitoringToolbarProps> = ({ pageTitle, onRefresh }) => {
  const {
    currentTimerange,
    handleTimeChange,
    setRefreshInterval,
    refreshInterval,
    setIsPaused,
    isPaused,
    isDisabled,
  } = useContext(MonitoringTimeContainer.Context);
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
    <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween" responsive>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" justifyContent="spaceEvenly" direction="column" responsive>
          <EuiFlexItem>
            <div id="setupModeNav">{/* HERE GOES THE SETUP BUTTON */}</div>
          </EuiFlexItem>
          <EuiFlexItem className="monTopNavSecondItem">
            {pageTitle && (
              <div data-test-subj="monitoringPageTitle">
                <EuiTitle size="xs">
                  <h1>{pageTitle}</h1>
                </EuiTitle>
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <div style={{ padding: 8 }}>
          <EuiSuperDatePicker
            isDisabled={isDisabled}
            start={currentTimerange.from}
            end={currentTimerange.to}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            isPaused={isPaused}
            refreshInterval={refreshInterval}
            onRefreshChange={onRefreshChange}
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
