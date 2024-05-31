/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import { StackedBarChart, StackedBarChartProps } from '../stacked_bar_chart';
import { TopNSubchart } from '../../../common/topn';
import { ChartGrid } from '../chart_grid';
import { AsyncState } from '../../hooks/use_async';
import { AsyncComponent } from '../async_component';
import { SubChart } from '../subchart';

interface Props {
  type: TopNType;
  state: AsyncState<{ charts: TopNSubchart[] }>;
  displayOption: StackTracesDisplayOption;
  onChangeDisplayOption: (nextOption: StackTracesDisplayOption) => void;
  onStackedBarChartBrushEnd: StackedBarChartProps['onBrushEnd'];
  onChartClick: (category: string) => void;
  limit: number;
  onShowMoreClick?: (newLimit: number) => void;
}

const displayOptions = [
  {
    id: StackTracesDisplayOption.StackTraces,
    iconType: 'visLine',
    label: i18n.translate('xpack.profiling.stackTracesView.stackTracesCountButton', {
      defaultMessage: 'Stack traces',
    }),
  },
  {
    id: StackTracesDisplayOption.Percentage,
    iconType: 'percent',
    label: i18n.translate('xpack.profiling.stackTracesView.percentagesButton', {
      defaultMessage: 'Percentages',
    }),
  },
];

export function StackTraces({
  type,
  state,
  displayOption,
  onChangeDisplayOption,
  onStackedBarChartBrushEnd,
  limit,
  onShowMoreClick,
  onChartClick,
}: Props) {
  const charts = state.data?.charts ?? [];
  const isTracesType = type === TopNType.Traces;
  const [selectedSubchart, setSelectedSubchart] = useState<TopNSubchart | undefined>(undefined);

  function handleChartClick(selectedChart: TopNSubchart) {
    // When clicking on the charts on the Traces view, the flyout must open
    if (type === TopNType.Traces) {
      setSelectedSubchart(selectedChart);
    } else {
      onChartClick(selectedChart.Category);
    }
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow>
          <EuiPanel>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiButtonGroup
                  idSelected={displayOption}
                  type="single"
                  onChange={(nextValue) => {
                    onChangeDisplayOption(nextValue as StackTracesDisplayOption);
                  }}
                  options={displayOptions}
                  legend={i18n.translate('xpack.profiling.stackTracesView.displayOptionLegend', {
                    defaultMessage: 'Display option',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ alignContent: 'center' }}>
                <AsyncComponent size="xl" {...state} style={{ height: 400 }}>
                  <StackedBarChart
                    height={400}
                    charts={charts}
                    asPercentages={displayOption === StackTracesDisplayOption.Percentage}
                    onBrushEnd={onStackedBarChartBrushEnd}
                    showFrames={isTracesType}
                    onClick={handleChartClick}
                  />
                </AsyncComponent>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <AsyncComponent size="m" mono {...state} style={{ minHeight: 200 }}>
            <>
              <EuiSpacer />
              <EuiTitle size="s">
                <h1>
                  {i18n.translate('xpack.profiling.chartGrid.h1.topLabel', {
                    defaultMessage: 'Top {size}',
                    values: {
                      size: onShowMoreClick ? charts.length : Math.min(limit, charts.length),
                    },
                  })}
                </h1>
              </EuiTitle>
              <ChartGrid
                charts={charts}
                limit={limit}
                showFrames={isTracesType}
                onChartClick={handleChartClick}
              />
            </>
          </AsyncComponent>
        </EuiFlexItem>
        {onShowMoreClick && charts.length > limit ? (
          <EuiFlexItem>
            <EuiButton
              data-test-subj="profilingStackTracesViewShowMoreButton"
              onClick={() => onShowMoreClick(limit + 10)}
            >
              {i18n.translate('xpack.profiling.stackTracesView.showMoreButton', {
                defaultMessage: 'Show more',
              })}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {selectedSubchart && (
        <EuiFlyout
          onClose={() => {
            setSelectedSubchart(undefined);
          }}
        >
          <SubChart
            style={{ overflow: 'auto' }}
            index={selectedSubchart.Index}
            color={selectedSubchart.Color}
            category={selectedSubchart.Category}
            label={selectedSubchart.Label}
            percentage={selectedSubchart.Percentage}
            metadata={selectedSubchart.Metadata}
            height={200}
            data={selectedSubchart.Series}
            sample={null}
            showAxes
            showFrames={isTracesType}
            padTitle
          />
        </EuiFlyout>
      )}
    </>
  );
}
