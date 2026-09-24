/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiSuperDatePicker } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import React from 'react';
import type { TimePickerQuickRange } from '../date_picker/typings';
import { EnvironmentSelect } from '../environment_select';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useUnifiedEnvironmentsFetcher } from '../../../hooks/use_unified_environments_fetcher';
import type { Environment } from '../../../../common/environment_rt';
import { useRequestFlyoutContext } from './request_flyout_context';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

export function RequestFlyoutQueryControls() {
  const {
    deps: { core },
    connection,
    filters: { environment, setEnvironment, start, end, rangeFrom, rangeTo, setRange },
    onRefresh,
  } = useRequestFlyoutContext();

  const commonlyUsedRanges = core.uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES,
    []
  );

  // Pass ISO start/end (not relative rangeFrom/rangeTo) — the API requires ISO date strings.
  const { environments, status: environmentsStatus } = useUnifiedEnvironmentsFetcher({
    serviceName: connection.sourceServiceName,
    start,
    end,
  });

  return (
    <EuiPanel hasShadow={false} paddingSize="none" data-test-subj="requestFlyoutQueryControls">
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiSuperDatePicker
            start={rangeFrom}
            end={rangeTo}
            onTimeChange={({ start: from, end: to }) => setRange({ rangeFrom: from, rangeTo: to })}
            onRefresh={onRefresh}
            commonlyUsedRanges={commonlyUsedRanges.map(({ from, to, display }) => ({
              start: from,
              end: to,
              label: display,
            }))}
            showUpdateButton
            updateButtonProps={{ fill: false }}
            width="full"
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EnvironmentSelect
            compressed
            fullWidth
            status={environmentsStatus as FETCH_STATUS}
            environment={environment}
            availableEnvironments={environments}
            serviceName={connection.sourceServiceName}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            onChange={(next) => setEnvironment(next as Environment)}
            ebt={{ element: REQUEST_FLYOUT_EBT_ELEMENTS.QUERY_CONTROLS }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiPanel>
  );
}
