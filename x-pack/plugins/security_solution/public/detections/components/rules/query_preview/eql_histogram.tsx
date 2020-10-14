/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';

import * as i18n from './translations';
import { getHistogramConfig } from './helpers';
import {
  ChartSeriesData,
  ChartSeriesConfigs,
  ChartData,
} from '../../../../common/components/charts/common';
import { InspectQuery } from '../../../../common/store/inputs/model';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { hasEqlSequenceQuery } from '../../../../../common/detection_engine/utils';
import { inputsModel } from '../../../../common/store';
import { PreviewHistogram } from './histogram';

export const ID = 'queryEqlPreviewHistogramQuery';

interface PreviewEqlQueryHistogramProps {
  to: string;
  from: string;
  totalCount: number;
  isLoading: boolean;
  query: string;
  data: ChartData[];
  inspect: InspectQuery;
  refetch: inputsModel.Refetch;
}

export const PreviewEqlQueryHistogram = ({
  from,
  to,
  totalCount,
  query,
  data,
  inspect,
  refetch,
  isLoading,
}: PreviewEqlQueryHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  useEffect((): void => {
    if (!isInitializing) {
      setQuery({ id: ID, inspect, loading: false, refetch });
    }
  }, [setQuery, inspect, isInitializing, refetch]);

  const barConfig = useMemo(
    (): ChartSeriesConfigs => getHistogramConfig(to, from, hasEqlSequenceQuery(query)),
    [from, to, query]
  );

  const subtitle = useMemo(
    (): string =>
      isLoading ? i18n.PREVIEW_SUBTITLE_LOADING : i18n.QUERY_PREVIEW_TITLE(totalCount),
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
      disclaimer={i18n.PREVIEW_QUERY_DISCLAIMER_EQL}
      isLoading={isLoading}
      data-test-subj="queryPreviewEqlHistogram"
    />
  );
};
