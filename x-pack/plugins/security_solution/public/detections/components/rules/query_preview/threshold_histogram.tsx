/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { BarChart } from '../../../../common/components/charts/barchart';
import { getThresholdHistogramConfig } from './helpers';
import { InspectButton } from '../../../../common/components/inspect';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';
import { ESQueryStringQuery } from '../../../../../common/typed_json';
import { Panel } from '../../../../common/components/panel';

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

  const [isLoading, { inspect, refetch }, buckets] = useMatrixHistogram({
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
    if (buckets != null) {
      return {
        data: buckets.map<{ x: string; y: number; g: string }>(({ key, doc_count: docCount }) => ({
          x: key,
          y: docCount,
          g: key,
        })),
        totalCount: buckets.length,
      };
    } else {
      return {
        data: [],
        totalCount: 0,
      };
    }
  }, [buckets]);

  return (
    <>
      {totalCount > 0 && (
        <Panel height={300}>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem grow={1}>
              <EuiFlexGroup direction="row" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h2 data-test-subj="header-section-title">
                      {i18n.QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE(totalCount)}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <InspectButton
                    queryId={ID}
                    inspectIndex={0}
                    title={i18n.QUERY_PREVIEW_INSPECT_TITLE}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <BarChart
                configs={getThresholdHistogramConfig()}
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
      )}
    </>
  );
};
