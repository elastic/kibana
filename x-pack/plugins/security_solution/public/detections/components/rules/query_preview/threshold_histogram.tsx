/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { getThresholdHistogramConfig } from './helpers';
import { ChartSeriesConfigs, ChartSeriesData } from '../../../../common/components/charts/common';
import { InspectResponse } from '../../../../../public/types';
import { inputsModel } from '../../../../common/store';
import { PreviewHistogram } from './histogram';

export const ID = 'queryPreviewThresholdHistogramQuery';

interface PreviewThresholdQueryHistogramProps {
  isLoading: boolean;
  buckets: Array<{
    key: string;
    doc_count: number;
  }>;
  inspect: InspectResponse;
  refetch: inputsModel.Refetch;
}

export const PreviewThresholdQueryHistogram = ({
  buckets,
  inspect,
  refetch,
  isLoading,
}: PreviewThresholdQueryHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: ID, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch]);

  const { data, totalCount } = useMemo((): { data: ChartSeriesData[]; totalCount: number } => {
    const total = buckets.length;

    const dataBuckets = buckets.map<{ x: string; y: number; g: string }>(
      ({ key, doc_count: docCount }) => ({
        x: key,
        y: docCount,
        g: key,
      })
    );
    return {
      data: [{ key: 'hits', value: dataBuckets }],
      totalCount: total,
    };
  }, [buckets]);

  const barConfig = useMemo((): ChartSeriesConfigs => getThresholdHistogramConfig(), []);

  const subtitle = useMemo(
    (): string =>
      isLoading
        ? i18n.QUERY_PREVIEW_SUBTITLE_LOADING
        : i18n.QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE(totalCount),
    [isLoading, totalCount]
  );

  return (
    <PreviewHistogram
      id={ID}
      data={data}
      barConfig={barConfig}
      title={i18n.QUERY_GRAPH_HITS_TITLE}
      subtitle={subtitle}
      disclaimer={i18n.QUERY_PREVIEW_DISCLAIMER}
      isLoading={isLoading}
      dataTestSubj="thresholdQueryPreviewHistogram"
    />
  );
};
