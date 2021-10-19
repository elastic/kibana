/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { Unit } from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getHistogramConfig, isNoisy } from './helpers';
import { ChartSeriesConfigs, ChartSeriesData } from '../../../../common/components/charts/common';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { BarChart } from '../../../../common/components/charts/barchart';
import { usePreviewHistogram } from './use_preview_histogram';
import { formatDate } from '../../../../common/components/super_date_picker';

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  margin: 0 auto;
`;

export const ID = 'previewHistogram';

interface PreviewHistogramProps {
  timeFrame: Unit;
  previewId: string;
  addNoiseWarning: () => void;
  isPreviewRequestInProgress: boolean;
  spaceId: string;
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

export const PreviewHistogram = ({
  timeFrame,
  previewId,
  addNoiseWarning,
  isPreviewRequestInProgress,
  spaceId,
}: PreviewHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  const from = `now-1${timeFrame}`;
  const to = 'now';
  const startDate = useMemo(() => formatDate(from), [from]);
  const endDate = useMemo(() => formatDate(to), [to]);

  const [isLoading, { data, inspect, totalCount, refetch }] = usePreviewHistogram({
    previewId,
    startDate,
    endDate,
    spaceId,
  });

  useEffect(() => {
    if (isNoisy(totalCount, timeFrame)) {
      addNoiseWarning();
    }
  }, [totalCount, addNoiseWarning, timeFrame]);

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: ID, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch]);

  const barConfig = useMemo(
    (): ChartSeriesConfigs => getHistogramConfig(to, from, true),
    [from, to]
  );

  const subtitle = useMemo(
    (): string =>
      isLoading ? i18n.QUERY_PREVIEW_SUBTITLE_LOADING : i18n.QUERY_PREVIEW_TITLE(totalCount),
    [isLoading, totalCount]
  );

  const chartData = useMemo((): ChartSeriesData[] => [{ key: 'hits', value: data }], [data]);

  return (
    <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem grow={1}>
          <HeaderSection
            id={ID}
            title={i18n.QUERY_GRAPH_HITS_TITLE}
            titleSize="xs"
            subtitle={subtitle}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {isLoading || isPreviewRequestInProgress ? (
            <LoadingChart size="l" data-test-subj="preview-histogram-loading" />
          ) : (
            <BarChart
              configs={barConfig}
              barChart={chartData}
              data-test-subj="preview-histogram-bar-chart"
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>
            <EuiSpacer />
            <EuiText size="s" color="subdued">
              <p>{i18n.QUERY_PREVIEW_DISCLAIMER}</p>
            </EuiText>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Panel>
  );
};
