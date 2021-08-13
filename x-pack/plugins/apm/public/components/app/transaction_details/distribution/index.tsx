/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BrushEndListener, XYBrushArea } from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useTransactionDistributionFetcher } from '../../../../hooks/use_transaction_distribution_fetcher';
import { TransactionDistributionChart } from '../../../shared/charts/transaction_distribution_chart';
import { useUiTracker } from '../../../../../../observability/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';

const DEFAULT_PERCENTILE_THRESHOLD = 95;
const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

interface Props {
  markerCurrentTransaction?: number;
  onChartSelection: BrushEndListener;
  onClearSelection: () => void;
  selection?: [number, number];
}

export function TransactionDistribution({
  markerCurrentTransaction,
  onChartSelection,
  onClearSelection,
  selection,
}: Props) {
  const {
    core: { notifications },
  } = useApmPluginContext();

  const { serviceName, transactionType } = useApmServiceContext();

  const {
    query: { kuery, environment },
  } = useApmParams('/services/:serviceName');

  const { urlParams } = useUrlParams();

  const { transactionName, start, end } = urlParams;

  const clearSelectionButtonLabel = i18n.translate(
    'xpack.apm.transactionDetails.clearSelectionButtonLabel',
    {
      defaultMessage: 'Clear selection',
    }
  );

  const {
    error,
    percentileThresholdValue,
    startFetch,
    cancelFetch,
    transactionDistribution,
  } = useTransactionDistributionFetcher({
    environment,
    kuery,
    serviceName,
    transactionName,
    transactionType,
    start,
    end,
    percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
  });

  // start fetching on load
  // we want this effect to execute exactly once after the component mounts
  useEffect(() => {
    startFetch();

    return () => {
      // cancel any running async partial request when unmounting the component
      // we want this effect to execute exactly once after the component mounts
      cancelFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.transactionDetails.distribution.errorTitle',
          {
            defaultMessage: 'An error occurred fetching the distribution',
          }
        ),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const trackApmEvent = useUiTracker({ app: 'apm' });

  const onTrackedChartSelection: BrushEndListener = (
    brushArea: XYBrushArea
  ) => {
    onChartSelection(brushArea);
    trackApmEvent({ metric: 'transaction_distribution_chart_selection' });
  };

  const onTrackedClearSelection = () => {
    onClearSelection();
    trackApmEvent({ metric: 'transaction_distribution_chart_clear_selection' });
  };

  return (
    <>
      <EuiFlexGroup data-test-subj="apmCorrelationsTabContent">
        <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
          <EuiTitle size="xs">
            <h5 data-test-subj="apmCorrelationsLatencyCorrelationsChartTitle">
              {i18n.translate(
                'xpack.apm.transactionDetails.distribution.panelTitle',
                {
                  defaultMessage: 'Latency distribution',
                }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {selection && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              <EuiFlexItem
                grow={false}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <EuiText size="xs">
                  {i18n.translate(
                    'xpack.apm.transactionDetails.distribution.selectionText',
                    {
                      defaultMessage: `Selection: {selectionFrom} - {selectionTo}ms`,
                      values: {
                        selectionFrom: Math.round(selection[0] / 1000),
                        selectionTo: Math.round(selection[1] / 1000),
                      },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <EuiButtonEmpty
                  onClick={onTrackedClearSelection}
                  iconType="cross"
                  size="xs"
                >
                  {clearSelectionButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionDistributionChart
        markerCurrentTransaction={markerCurrentTransaction}
        markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
        markerValue={percentileThresholdValue ?? 0}
        overallHistogram={transactionDistribution}
        onChartSelection={onTrackedChartSelection}
        selection={selection}
      />
    </>
  );
}
