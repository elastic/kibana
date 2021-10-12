/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getHistogramConfig } from './helpers';
import {
  ChartSeriesConfigs,
  ChartSeriesData,
  ChartData,
} from '../../../../common/components/charts/common';
import { InspectResponse } from '../../../../types';
import { inputsModel } from '../../../../common/store';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { BarChart } from '../../../../common/components/charts/barchart';

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  margin: 0 auto;
`;

export const ID = 'previewHistogram';

interface PreviewHistogramProps {
  data: ChartData[];
  dataTestSubj?: string;
  disclaimer: string;
  from: string;
  inspect: InspectResponse;
  isLoading: boolean;
  refetch: inputsModel.Refetch;
  title: string;
  to: string;
  totalCount: number;
}

export const PreviewHistogram = ({
  data,
  dataTestSubj,
  disclaimer,
  from,
  inspect,
  isLoading,
  refetch,
  title,
  to,
  totalCount,
}: PreviewHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

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
    <>
      <Panel height={300} data-test-subj={dataTestSubj}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection id={ID} title={title} titleSize="xs" subtitle={subtitle} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {isLoading ? (
              <LoadingChart size="l" data-test-subj="queryPreviewLoading" />
            ) : (
              <BarChart
                configs={barConfig}
                barChart={chartData}
                stackByField={undefined}
                timelineId={undefined}
                data-test-subj="sharedPreviewQueryHistogram"
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>{disclaimer}</p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
    </>
  );
};
