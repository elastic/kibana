/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { Environment } from '../../../../../common/environment_rt';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { useUnifiedEnvironmentsFetcher } from '../../../../hooks/use_unified_environments_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { TimePickerQuickRange } from '../../date_picker/typings';
import { EnvironmentSelect } from '../../environment_select';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';

// The transaction type is resolved by the overview, which needs it to build the chart queries, so it
// is passed in rather than fetched twice.
export function ServiceFlyoutQueryControls({
  transactionTypes,
  transactionTypeStatus,
  selectedTransactionType,
}: {
  transactionTypes: string[];
  transactionTypeStatus: FETCH_STATUS;
  selectedTransactionType?: string;
}) {
  const {
    deps: { core },
    service,
    capabilities,
    filters: {
      environment,
      rangeFrom,
      rangeTo,
      setEnvironment,
      setRange,
      onRefresh,
      setTransactionType,
    },
  } = useServiceFlyoutContext();

  const showTransactionTypeFilter = capabilities.overview?.transactionTypeFilter ?? false;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { environments, status: environmentsStatus } = useUnifiedEnvironmentsFetcher({
    serviceName: service.name,
    start,
    end,
  });

  const commonlyUsedRanges = useMemo(() => {
    const timePickerQuickRanges =
      core?.uiSettings?.get<TimePickerQuickRange[]>(UI_SETTINGS.TIMEPICKER_QUICK_RANGES) ?? [];

    return timePickerQuickRanges.map(({ from, to, display }) => ({
      start: from,
      end: to,
      label: display,
    }));
  }, [core?.uiSettings]);

  const transactionTypeOptions = transactionTypes.map((type) => ({ value: type, text: type }));
  const isTransactionTypeDisabled =
    transactionTypeStatus === FETCH_STATUS.LOADING || transactionTypeOptions.length === 0;

  return (
    <EuiPanel data-test-subj="serviceFlyoutQueryControls" hasShadow={false} paddingSize="none">
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiSuperDatePicker
            start={start || rangeFrom}
            end={end || rangeTo}
            onTimeChange={({ start: nextRangeFrom, end: nextRangeTo }) => {
              setRange({ rangeFrom: nextRangeFrom, rangeTo: nextRangeTo });
            }}
            onRefresh={onRefresh}
            showUpdateButton
            updateButtonProps={{ fill: false }}
            commonlyUsedRanges={commonlyUsedRanges}
            width="full"
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiFlexGrid columns={showTransactionTypeFilter ? 2 : 1} gutterSize="s">
            {showTransactionTypeFilter && (
              <EuiFlexItem>
                <EuiSelect
                  compressed
                  fullWidth
                  prepend={i18n.translate('xpack.apm.serviceFlyout.transactionTypeSelectLabel', {
                    defaultMessage: 'Transaction type',
                  })}
                  aria-label={i18n.translate(
                    'xpack.apm.serviceFlyout.transactionTypeSelectAriaLabel',
                    {
                      defaultMessage: 'Select transaction type',
                    }
                  )}
                  data-test-subj="serviceFlyoutTransactionTypeSelect"
                  {...getEbtProps({
                    action: APM_EBT_ACTIONS.SET_TRANSACTION_TYPE,
                    element: SERVICE_FLYOUT_EBT_ELEMENTS.QUERY_CONTROLS,
                  })}
                  disabled={isTransactionTypeDisabled}
                  options={
                    isTransactionTypeDisabled
                      ? [
                          {
                            value: '',
                            text: i18n.translate(
                              'xpack.apm.serviceFlyout.noTransactionTypeOptionLabel',
                              { defaultMessage: 'No transaction type available' }
                            ),
                          },
                        ]
                      : transactionTypeOptions
                  }
                  value={isTransactionTypeDisabled ? '' : selectedTransactionType ?? ''}
                  onChange={(event) => setTransactionType?.(event.currentTarget.value)}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EnvironmentSelect
                compressed
                fullWidth
                status={environmentsStatus}
                environment={environment}
                availableEnvironments={environments}
                serviceName={service.name}
                rangeFrom={rangeFrom ?? ''}
                rangeTo={rangeTo ?? ''}
                onChange={(nextEnvironment) => setEnvironment(nextEnvironment as Environment)}
                ebt={{ element: SERVICE_FLYOUT_EBT_ELEMENTS.QUERY_CONTROLS }}
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
