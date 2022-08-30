/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BrushEndListener, BrushEvent, XYBrushEvent } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUiTracker } from '@kbn/observability-plugin/public';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ChartTitleToolTip } from '../../../app/correlations/chart_title_tool_tip';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import {
  DurationDistributionChart,
  DurationDistributionChartData,
} from '../duration_distribution_chart';
import { TotalDocCountLabel } from '../duration_distribution_chart/total_doc_count_label';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

// Format the selected latency range for the "Clear selection" badge.
// If the two values share the same unit, it will only displayed once.
// For example: 12 - 23 ms / 12 ms - 3 s
export function getFormattedSelection(selection: [number, number]): string {
  const from = getDurationFormatter(selection[0])(selection[0]);
  const to = getDurationFormatter(selection[1])(selection[1]);

  return `${from.unit === to.unit ? from.value : from.formatted} - ${
    to.formatted
  }`;
}

// Enforce min height so it's consistent across all tabs on the same level
// to prevent "flickering" behavior
export const MIN_TAB_TITLE_HEIGHT = 56;

export function DurationDistributionChartWithScrubber({
  onClearSelection,
  onChartSelection,
  selection,
  status,
  markerCurrentEvent,
  percentileThresholdValue,
  chartData,
  totalDocCount,
  hasData,
  eventType,
}: {
  onClearSelection: () => void;
  onChartSelection: (event: XYBrushEvent) => void;
  selection?: [number, number];
  status: FETCH_STATUS;
  markerCurrentEvent?: number;
  percentileThresholdValue?: number | null;
  chartData: DurationDistributionChartData[];
  hasData: boolean;
  eventType: ProcessorEvent.transaction | ProcessorEvent.span;
  totalDocCount?: number;
}) {
  const emptySelectionText = i18n.translate(
    'xpack.apm.durationDistributionChartWithScrubber.emptySelectionText',
    {
      defaultMessage: 'Click and drag to select a range',
    }
  );

  const clearSelectionAriaLabel = i18n.translate(
    'xpack.apm.durationDistributionChartWithScrubber.clearSelectionAriaLabel',
    {
      defaultMessage: 'Clear selection',
    }
  );

  const trackApmEvent = useUiTracker({ app: 'apm' });

  const onTrackedChartSelection: BrushEndListener = (
    brushEvent: BrushEvent
  ) => {
    onChartSelection(brushEvent as XYBrushEvent);
    // metric name is transaction_x for bwc
    trackApmEvent({ metric: 'transaction_distribution_chart_selection' });
  };

  const onTrackedClearSelection = () => {
    onClearSelection();
    // metric name is transaction_x for bwc
    trackApmEvent({ metric: 'transaction_distribution_chart_clear_selection' });
  };

  return (
    <>
      <EuiFlexGroup
        style={{ minHeight: MIN_TAB_TITLE_HEIGHT }}
        alignItems="center"
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5 data-test-subj="apmDurationDistributionChartWithScrubberTitle">
              {i18n.translate(
                'xpack.apm.durationDistributionChartWithScrubber.panelTitle',
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

        <EuiFlexItem grow={false}>
          <TotalDocCountLabel
            eventType={eventType}
            totalDocCount={totalDocCount}
          />
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
                  data-test-sub="apmDurationDistributionChartWithScrubberTitleClearSelectionBadge"
                >
                  {i18n.translate(
                    'xpack.apm.durationDistributionChartWithScrubber.selectionText',
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

      <DurationDistributionChart
        data={chartData}
        markerCurrentEvent={markerCurrentEvent}
        markerValue={percentileThresholdValue ?? 0}
        onChartSelection={onTrackedChartSelection as BrushEndListener}
        hasData={hasData}
        selection={selection}
        status={status}
        eventType={eventType}
      />
    </>
  );
}
