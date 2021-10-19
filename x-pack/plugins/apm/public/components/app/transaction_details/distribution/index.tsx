/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useUiTracker } from '../../../../../../observability/public';

import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/search_strategies/constants';

import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';

import {
  TransactionDistributionChart,
  TransactionDistributionChartData,
} from '../../../shared/charts/transaction_distribution_chart';
import { isErrorMessage } from '../../correlations/utils/is_error_message';

import type { TabContentProps } from '../types';
import { useWaterfallFetcher } from '../use_waterfall_fetcher';
import { WaterfallWithSummary } from '../waterfall_with_summary';

// Enforce min height so it's consistent across all tabs on the same level
// to prevent "flickering" behavior
const MIN_TAB_TITLE_HEIGHT = 56;

type Selection = [number, number];

// Format the selected latency range for the "Clear selection" badge.
// If the two values share the same unit, it will only displayed once.
// For example: 12 - 23 ms / 12 ms - 3 s
export function getFormattedSelection(selection: Selection): string {
  const from = getDurationFormatter(selection[0])(selection[0]);
  const to = getDurationFormatter(selection[1])(selection[1]);

  return `${from.unit === to.unit ? from.value : from.formatted} - ${
    to.formatted
  }`;
}

interface TransactionDistributionProps {
  onChartSelection: (event: XYBrushEvent) => void;
  onClearSelection: () => void;
  selection?: Selection;
  traceSamples: TabContentProps['traceSamples'];
}

export function TransactionDistribution({
  onChartSelection,
  onClearSelection,
  selection,
  traceSamples,
}: TransactionDistributionProps) {
  const { serviceName, transactionType } = useApmServiceContext();

  const {
    core: { notifications },
  } = useApmPluginContext();

  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

  const { waterfall, status: waterfallStatus } = useWaterfallFetcher();

  const markerCurrentTransaction =
    waterfall.entryWaterfallTransaction?.doc.transaction.duration.us;

  const emptySelectionText = i18n.translate(
    'xpack.apm.transactionDetails.emptySelectionText',
    {
      defaultMessage: 'Click and drag to select a range',
    }
  );

  const clearSelectionAriaLabel = i18n.translate(
    'xpack.apm.transactionDetails.clearSelectionAriaLabel',
    {
      defaultMessage: 'Clear selection',
    }
  );

  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    data = { log: [] },
    status,
    error,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && environment && start && end) {
        return callApmApi({
          endpoint: 'GET /internal/apm/latency/overall_distribution',
          params: {
            query: {
              serviceName,
              transactionName,
              transactionType,
              kuery,
              environment,
              start,
              end,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            },
          },
        });
      }
    },
    [
      serviceName,
      transactionName,
      transactionType,
      kuery,
      environment,
      start,
      end,
    ]
  );

  const overallHistogram =
    data.overallHistogram === undefined && status !== FETCH_STATUS.LOADING
      ? []
      : data.overallHistogram;
  const hasData =
    Array.isArray(overallHistogram) && overallHistogram.length > 0;

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

  const onTrackedChartSelection = (brushEvent: XYBrushEvent) => {
    onChartSelection(brushEvent);
    trackApmEvent({ metric: 'transaction_distribution_chart_selection' });
  };

  const onTrackedClearSelection = () => {
    onClearSelection();
    trackApmEvent({ metric: 'transaction_distribution_chart_clear_selection' });
  };

  const transactionDistributionChartData: TransactionDistributionChartData[] =
    [];

  if (Array.isArray(overallHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'xpack.apm.transactionDistribution.chart.allTransactionsLabel',
        { defaultMessage: 'All transactions' }
      ),
      histogram: overallHistogram,
    });
  }

  return (
    <div data-test-subj="apmTransactionDistributionTabContent">
      <EuiFlexGroup style={{ minHeight: MIN_TAB_TITLE_HEIGHT }}>
        <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
          <EuiTitle size="xs">
            <h5 data-test-subj="apmTransactionDistributionChartTitle">
              {i18n.translate(
                'xpack.apm.transactionDetails.distribution.panelTitle',
                {
                  defaultMessage: 'Latency distribution',
                }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {hasData && !selection && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
              <EuiFlexItem
                grow={false}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <EuiIcon type="iInCircle" title={emptySelectionText} size="s" />
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <EuiText size="xs">{emptySelectionText}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {hasData && selection && (
          <EuiFlexItem grow={false}>
            <EuiBadge
              iconType="cross"
              iconSide="left"
              onClick={onTrackedClearSelection}
              onClickAriaLabel={clearSelectionAriaLabel}
              iconOnClick={onTrackedClearSelection}
              iconOnClickAriaLabel={clearSelectionAriaLabel}
              data-test-sub="apmTransactionDetailsDistributionClearSelectionBadge"
            >
              {i18n.translate(
                'xpack.apm.transactionDetails.distribution.selectionText',
                {
                  defaultMessage: `Selection: {formattedSelection}`,
                  values: {
                    formattedSelection: getFormattedSelection(selection),
                  },
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionDistributionChart
        data={transactionDistributionChartData}
        markerCurrentTransaction={markerCurrentTransaction}
        markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
        markerValue={data.percentileThresholdValue ?? 0}
        onChartSelection={onTrackedChartSelection as BrushEndListener}
        hasData={hasData}
        selection={selection}
        status={status}
      />

      <EuiSpacer size="s" />

      <WaterfallWithSummary
        urlParams={urlParams}
        waterfall={waterfall}
        isLoading={waterfallStatus === FETCH_STATUS.LOADING}
        traceSamples={traceSamples}
      />
    </div>
  );
}
