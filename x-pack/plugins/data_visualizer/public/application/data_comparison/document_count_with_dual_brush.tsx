/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WindowParameters, LogRateHistogramItem } from '@kbn/aiops-utils';
import React, { FC } from 'react';
import { DocumentCountChart } from '@kbn/aiops-components';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { BrushSelectionUpdateHandler, DocumentCountChartProps } from '@kbn/aiops-components';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';
import { Filter } from '@kbn/es-query';
import useObservable from 'react-use/lib/useObservable';
import { StateManager, useDataComparisonStateManagerContext } from './use_state_manager';
import { useDataVisualizerKibana } from '../kibana_context';
import { DocumentCountStats } from '../../../common/types/field_stats';
import { TotalCountHeader } from '../common/components/document_count_content/total_count_header';
import { SamplingMenu } from '../common/components/random_sampling_menu/random_sampling_menu';

export interface DocumentCountContentProps
  extends Omit<
    DocumentCountChartProps,
    | 'dependencies'
    | 'chartPoints'
    | 'timeRangeEarliest'
    | 'timeRangeLatest'
    | 'interval'
    | 'chartPointsSplitLabel'
  > {
  brushSelectionUpdateHandler: BrushSelectionUpdateHandler;
  documentCountStats?: DocumentCountStats;
  documentCountStatsSplit?: DocumentCountStats;
  documentCountStatsSplitLabel?: string;
  isBrushCleared: boolean;
  totalCount: number;
  sampleProbability: number;
  initialAnalysisStart?: number | WindowParameters;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  windowParameters?: WindowParameters;
  incomingInitialAnalysisStart?: number | WindowParameters;
  randomSampler: RandomSampler;
  reload: () => void;
  approximate: boolean;
  stateManager: StateManager;
  label?: string;
}

export const DocumentCountWithDualBrush: FC<DocumentCountContentProps> = ({
  randomSampler,
  reload,
  brushSelectionUpdateHandler,
  documentCountStats,
  documentCountStatsSplit,
  documentCountStatsSplitLabel = '',
  isBrushCleared,
  totalCount,
  sampleProbability,
  initialAnalysisStart,
  barColorOverride,
  barHighlightColorOverride,
  windowParameters,
  incomingInitialAnalysisStart,
  approximate,
  stateManager,
  label,
  ...docCountChartProps
}) => {
  const {
    services: {
      data,
      uiSettings,
      fieldFormats,
      charts,
      unifiedSearch: {
        ui: { SearchBar },
      },
    },
  } = useDataVisualizerKibana();

  const { dataView } = useDataComparisonStateManagerContext();
  const stateFilters = useObservable(stateManager.filters$);

  const bucketTimestamps = Object.keys(documentCountStats?.buckets ?? {}).map((time) => +time);
  const splitBucketTimestamps = Object.keys(documentCountStatsSplit?.buckets ?? {}).map(
    (time) => +time
  );
  const timeRangeEarliest = Math.min(...[...bucketTimestamps, ...splitBucketTimestamps]);
  const timeRangeLatest = Math.max(...[...bucketTimestamps, ...splitBucketTimestamps]);

  if (dataView.getTimeField() === undefined) {
    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiTitle size="xxs">
          <h3>{label}</h3>
        </EuiTitle>
        <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
          <EuiFlexItem>
            <SearchBar
              key={`dataComparison-${stateManager.id}`}
              dataTestSubj="dataVisualizerQueryInput"
              appName={'dataVisualizer'}
              showFilterBar={true}
              showDatePicker={false}
              showQueryInput={false}
              filters={stateFilters}
              onFiltersUpdated={(filters: Filter[]) => stateManager.filters$.next(filters)}
              indexPatterns={[dataView]}
              displayStyle={'inPage'}
              isClearable={true}
              customSubmitButton={<div />}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SamplingMenu randomSampler={randomSampler} reload={reload} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }
  if (
    documentCountStats === undefined ||
    documentCountStats.buckets === undefined ||
    timeRangeEarliest === undefined ||
    timeRangeLatest === undefined
  ) {
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
  }

  const chartPoints: LogRateHistogramItem[] = Object.entries(documentCountStats.buckets).map(
    ([time, value]) => ({
      time: +time,
      value,
    })
  );

  let chartPointsSplit: LogRateHistogramItem[] | undefined;
  if (documentCountStatsSplit?.buckets !== undefined) {
    chartPointsSplit = Object.entries(documentCountStatsSplit?.buckets).map(([time, value]) => ({
      time: +time,
      value,
    }));
  }

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <TotalCountHeader totalCount={totalCount} approximate={approximate} label={label} />
      </EuiFlexItem>

      <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
        <EuiFlexItem>
          <SearchBar
            key={`dataComparison-${stateManager.id}`}
            dataTestSubj="dataVisualizerQueryInput"
            appName={'dataVisualizer'}
            showFilterBar={true}
            showDatePicker={false}
            showQueryInput={false}
            filters={stateFilters}
            onFiltersUpdated={(filters: Filter[]) => stateManager.filters$.next(filters)}
            indexPatterns={[dataView]}
            displayStyle={'inPage'}
            isClearable={true}
            customSubmitButton={<div />}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SamplingMenu randomSampler={randomSampler} reload={reload} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {documentCountStats.interval !== undefined && (
        <EuiFlexItem>
          <DocumentCountChart
            dependencies={{ data, uiSettings, fieldFormats, charts }}
            brushSelectionUpdateHandler={brushSelectionUpdateHandler}
            chartPoints={chartPoints}
            chartPointsSplit={chartPointsSplit}
            timeRangeEarliest={timeRangeEarliest}
            timeRangeLatest={timeRangeLatest}
            interval={documentCountStats.interval}
            chartPointsSplitLabel={documentCountStatsSplitLabel}
            isBrushCleared={isBrushCleared}
            autoAnalysisStart={initialAnalysisStart}
            barColorOverride={barColorOverride}
            barHighlightColorOverride={barHighlightColorOverride}
            {...docCountChartProps}
            height={60}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
