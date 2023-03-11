/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import { AreaChart } from '../../../common/components/charts/areachart';
import { BarChart } from '../../../common/components/charts/barchart';

import { histogramDateTimeFormatter } from '../../../common/components/utils';

import { StatItemHeader } from './stat_item_header';
import { useToggleStatus } from './use_toggle_status';
import type { StatItemsProps } from './types';
import { areachartConfigs, barchartConfigs, FlexItem, ChartHeight } from './utils';
import { Metric } from './metric';
import { MetricEmbeddable } from './metric_embeddable';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { LensEmbeddable } from '../../../common/components/visualization_actions/lens_embeddable';

export const StatItemsComponent = React.memo<StatItemsProps>(
  ({
    areaChart,
    barChart,
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    from,
    grow,
    id,
    loading = false,
    index,
    updateDateRange,
    statKey = 'item',
    to,
    barChartLensAttributes,
    areaChartLensAttributes,
    setQuerySkip,
  }) => {
    const isBarChartDataAvailable = !!(
      barChart &&
      barChart.length &&
      barChart.every((item) => item.value != null && item.value.length > 0)
    );
    const isAreaChartDataAvailable = !!(
      areaChart &&
      areaChart.length &&
      areaChart.every((item) => item.value != null && item.value.length > 0)
    );

    const timerange = useMemo(
      () => ({
        from,
        to,
      }),
      [from, to]
    );

    const { isToggleExpanded, onToggle } = useToggleStatus({ id, setQuerySkip });

    const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

    return (
      <FlexItem grow={grow} data-test-subj={`stat-${statKey}`}>
        <EuiPanel hasBorder>
          <StatItemHeader
            onToggle={onToggle}
            isToggleExpanded={isToggleExpanded}
            description={description}
          />
          {loading && (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" data-test-subj="loading-spinner" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {isToggleExpanded && !loading && (
            <>
              {isChartEmbeddablesEnabled ? (
                <MetricEmbeddable
                  fields={fields}
                  id={id}
                  timerange={timerange}
                  inspectTitle={description}
                />
              ) : (
                <Metric
                  fields={fields}
                  id={id}
                  timerange={timerange}
                  isAreaChartDataAvailable={isAreaChartDataAvailable}
                  isBarChartDataAvailable={isBarChartDataAvailable}
                  inspectTitle={description}
                  inspectIndex={index}
                />
              )}
              {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}
              <EuiFlexGroup gutterSize={isChartEmbeddablesEnabled ? 'none' : 'l'}>
                {enableBarChart && (
                  <FlexItem>
                    {isChartEmbeddablesEnabled && barChartLensAttributes ? (
                      <LensEmbeddable
                        data-test-subj="embeddable-bar-chart"
                        lensAttributes={barChartLensAttributes}
                        timerange={timerange}
                        id={id}
                        height={ChartHeight}
                        inspectTitle={description}
                      />
                    ) : (
                      <BarChart
                        barChart={barChart}
                        configs={barchartConfigs()}
                        visualizationActionsOptions={{
                          lensAttributes: barChartLensAttributes,
                          queryId: id,
                          inspectIndex: index,
                          timerange,
                          title: description,
                        }}
                      />
                    )}
                  </FlexItem>
                )}

                {enableAreaChart && from != null && to != null && (
                  <>
                    <FlexItem>
                      {isChartEmbeddablesEnabled && areaChartLensAttributes ? (
                        <LensEmbeddable
                          data-test-subj="embeddable-area-chart"
                          lensAttributes={areaChartLensAttributes}
                          timerange={timerange}
                          id={id}
                          height={ChartHeight}
                          inspectTitle={description}
                        />
                      ) : (
                        <AreaChart
                          areaChart={areaChart}
                          configs={areachartConfigs({
                            xTickFormatter: histogramDateTimeFormatter([from, to]),
                            onBrushEnd: updateDateRange,
                          })}
                          visualizationActionsOptions={{
                            lensAttributes: areaChartLensAttributes,
                            queryId: id,
                            inspectIndex: index,
                            timerange,
                            title: description,
                          }}
                        />
                      )}
                    </FlexItem>
                  </>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      </FlexItem>
    );
  },
  (prevProps, nextProps) =>
    prevProps.description === nextProps.description &&
    prevProps.enableAreaChart === nextProps.enableAreaChart &&
    prevProps.enableBarChart === nextProps.enableBarChart &&
    prevProps.from === nextProps.from &&
    prevProps.grow === nextProps.grow &&
    prevProps.loading === nextProps.loading &&
    prevProps.setQuerySkip === nextProps.setQuerySkip &&
    prevProps.id === nextProps.id &&
    prevProps.index === nextProps.index &&
    prevProps.updateDateRange === nextProps.updateDateRange &&
    prevProps.statKey === nextProps.statKey &&
    prevProps.to === nextProps.to &&
    deepEqual(prevProps.areaChart, nextProps.areaChart) &&
    deepEqual(prevProps.barChart, nextProps.barChart) &&
    deepEqual(prevProps.fields, nextProps.fields)
);

StatItemsComponent.displayName = 'StatItemsComponent';
