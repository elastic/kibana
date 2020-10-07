/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import * as i18n from './translations';
import { BarChart } from '../../../../common/components/charts/barchart';
import { getHistogramConfig } from './helpers';
import { ChartData, ChartSeriesConfigs } from '../../../../common/components/charts/common';
import { InspectQuery } from '../../../../common/store/inputs/model';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';

export const ID = 'queryEqlPreviewHistogramQuery';

interface PreviewEqlQueryHistogramProps {
  to: string;
  from: string;
  totalHits: number;
  data: ChartData[];
  inspect: InspectQuery;
}

export const PreviewEqlQueryHistogram = ({
  from,
  to,
  totalHits,
  data,
  inspect,
}: PreviewEqlQueryHistogramProps) => {
  const { setQuery, isInitializing } = useGlobalTime();

  useEffect((): void => {
    if (!isInitializing) {
      setQuery({ id: ID, inspect, loading: false, refetch: () => {} });
    }
  }, [setQuery, inspect, isInitializing]);

  const barConfig = useMemo((): ChartSeriesConfigs => getHistogramConfig(to, from), [from, to]);

  return (
    <>
      <Panel height={300}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={ID}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              subtitle={i18n.QUERY_PREVIEW_THRESHOLD_WITH_FIELD_TITLE(totalHits)}
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
                <p>{i18n.PREVIEW_QUERY_DISCLAIMER_EQL}</p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
    </>
  );
};
