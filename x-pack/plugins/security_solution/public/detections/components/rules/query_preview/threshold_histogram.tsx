/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { BarChart } from '../../../../common/components/charts/barchart';
import { getThresholdHistogramConfig } from './helpers';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';
import { ESQueryStringQuery } from '../../../../../common/typed_json';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { ChartSeriesConfigs } from '../../../../common/components/charts/common';

export const ID = 'queryPreviewThresholdHistogramQuery';

interface PreviewThresholdQueryHistogramProps {
  to: string;
  from: string;
  filterQuery: ESQueryStringQuery | undefined;
  threshold: { field: string | undefined; value: number } | undefined;
  index: string[];
}

export const PreviewThresholdQueryHistogram = ({
  from,
  to,
  filterQuery,
  threshold,
  index,
}: PreviewThresholdQueryHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  const [isLoading, { inspect, refetch, buckets }] = useMatrixHistogram({
    errorMessage: i18n.PREVIEW_QUERY_ERROR,
    endDate: from,
    startDate: to,
    filterQuery,
    indexNames: index,
    histogramType: MatrixHistogramType.events,
    stackByField: 'event.category',
    threshold,
  });

  useEffect((): void => {
    if (!isLoading && !isInitializing) {
      setQuery({ id: ID, inspect, loading: isLoading, refetch });
    }
  }, [setQuery, inspect, isLoading, isInitializing, refetch]);

  const { data, totalCount } = useMemo(() => {
    return {
      data: buckets.map<{ x: string; y: number; g: string }>(({ key, doc_count: docCount }) => ({
        x: key,
        y: docCount,
        g: key,
      })),
      totalCount: buckets.length,
    };
  }, [buckets]);

  const barConfig = useMemo((): ChartSeriesConfigs => getThresholdHistogramConfig(200), []);

  return (
    <>
      <Panel height={300}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={ID}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              subtitle={i18n.QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE(totalCount)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <BarChart
              configs={barConfig}
              barChart={[{ key: 'hits', value: data }]}
              stackByField={undefined}
              timelineId={undefined}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>{i18n.PREVIEW_QUERY_DISCLAIMER}</p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
    </>
  );
};
