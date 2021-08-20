/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BrushEndListener, XYBrushArea } from '@elastic/charts';
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
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useTransactionDistributionFetcher } from '../../../../hooks/use_transaction_distribution_fetcher';
import { TransactionDistributionChart } from '../../../shared/charts/transaction_distribution_chart';
import { useUiTracker } from '../../../../../../observability/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { isErrorMessage } from '../../correlations/utils/is_error_message';

const DEFAULT_PERCENTILE_THRESHOLD = 95;
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

interface Props {
  markerCurrentTransaction?: number;
  onChartSelection: BrushEndListener;
  onClearSelection: () => void;
  selection?: Selection;
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
    error,
    percentileThresholdValue,
    isRunning,
    startFetch,
    cancelFetch,
    transactionDistribution,
  } = useTransactionDistributionFetcher();

  useEffect(() => {
    if (isRunning) {
      cancelFetch();
    }

    startFetch({
      environment,
      kuery,
      serviceName,
      transactionName,
      transactionType,
      start,
      end,
      percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
    });

    return () => {
      // cancel any running async partial request when unmounting the component
      // we want this effect to execute exactly once after the component mounts
      cancelFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment, serviceName, kuery, start, end]);

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
        {!selection && (
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
        {selection && (
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
        markerCurrentTransaction={markerCurrentTransaction}
        markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
        markerValue={percentileThresholdValue ?? 0}
        overallHistogram={transactionDistribution}
        onChartSelection={onTrackedChartSelection}
        selection={selection}
      />
    </div>
  );
}
