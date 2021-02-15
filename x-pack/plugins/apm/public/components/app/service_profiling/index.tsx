/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { SearchBar } from '../../shared/search_bar';

interface ServiceProfilingProps {
  serviceName: string;
  environment?: string;
}

export function ServiceProfiling({
  serviceName,
  environment,
}: ServiceProfilingProps) {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  // @ts-expect-error
  const { data } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/profiling',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            environment,
          },
        },
      });
    },
    [start, end, environment, serviceName]
  );

  return (
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.apm.profilingOverviewTitle', {
                  defaultMessage: 'Profiling',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <Chart className="story-chart">
                <Settings showLegend flatLegend />
                <Partition
                  id="spec_1"
                  data={[]}
                  layers={[]}
                  config={{
                    partitionLayout: PartitionLayout.flame,
                  }}
                />
              </Chart>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
