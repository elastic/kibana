/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getHistogramConfig } from './helpers';
import {
  ChartSeriesConfigs,
  ChartSeriesData,
  ChartData,
} from '../../../../common/components/charts/common';
import { InspectResponse } from '../../../../../public/types';
import { inputsModel } from '../../../../common/store';
import { PreviewHistogram } from './histogram';

export const ID = 'queryPreviewCustomHistogramQuery';

interface PreviewCustomQueryHistogramProps {
  to: string;
  from: string;
  isLoading: boolean;
  data: ChartData[];
  totalCount: number;
  inspect: InspectResponse;
  refetch: inputsModel.Refetch;
}

export const PreviewCustomQueryHistogram = ({
  to,
  from,
  data,
  totalCount,
  inspect,
  refetch,
  isLoading,
}: PreviewCustomQueryHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: ID, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch]);

  const barConfig = useMemo((): ChartSeriesConfigs => getHistogramConfig(to, from, true), [
    from,
    to,
  ]);

  const subtitle = useMemo(
    (): string =>
      isLoading ? i18n.QUERY_PREVIEW_SUBTITLE_LOADING : i18n.QUERY_PREVIEW_TITLE(totalCount),
    [isLoading, totalCount]
  );

  const chartData = useMemo((): ChartSeriesData[] => [{ key: 'hits', value: data }], [data]);

  return (
    <PreviewHistogram
      id={ID}
      data={chartData}
      barConfig={barConfig}
      title={i18n.QUERY_GRAPH_HITS_TITLE}
      subtitle={subtitle}
      disclaimer={i18n.QUERY_PREVIEW_DISCLAIMER}
      isLoading={isLoading}
      data-test-subj="queryPreviewCustomHistogram"
    />
  );
};
