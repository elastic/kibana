/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

import { TransactionDistributionChart } from '../../../shared/charts/transaction_distribution_chart';

import type { TabContentProps } from '../types';
import { useWaterfallFetcher } from '../use_waterfall_fetcher';
import { WaterfallWithSummary } from '../waterfall_with_summary';

import { useTransactionDistributionChartData } from './use_transaction_distribution_chart_data';
import { HeightRetainer } from '../../../shared/height_retainer';
import { ChartTitleToolTip } from '../../correlations/chart_title_tool_tip';

// Enforce min height so it's consistent across all tabs on the same level
// to prevent "flickering" behavior
export const MIN_TAB_TITLE_HEIGHT = 56;

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
  const { urlParams } = useLegacyUrlParams();
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

  const trackApmEvent = useUiTracker({ app: 'apm' });

  const onTrackedChartSelection = (brushEvent: XYBrushEvent) => {
    onChartSelection(brushEvent);
    trackApmEvent({ metric: 'transaction_distribution_chart_selection' });
  };

  const onTrackedClearSelection = () => {
    onClearSelection();
    trackApmEvent({ metric: 'transaction_distribution_chart_clear_selection' });
  };

  const { chartData, hasData, percentileThresholdValue, status } =
    useTransactionDistributionChartData();

  return (
    <HeightRetainer>
      <div data-test-subj="apmTransactionDistributionTabContent">
        <EuiFlexGroup
          style={{ minHeight: MIN_TAB_TITLE_HEIGHT }}
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
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

          <EuiFlexItem grow={false}>
            <ChartTitleToolTip />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="xs"
            >
              {selection ? (
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
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type="iInCircle"
                      title={emptySelectionText}
                      size="s"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{emptySelectionText}</EuiText>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <TransactionDistributionChart
          data={chartData}
          markerCurrentTransaction={markerCurrentTransaction}
          markerValue={percentileThresholdValue ?? 0}
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
    </HeightRetainer>
  );
}
