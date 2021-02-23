/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import {
  getValueTypeConfig,
  ProfilingValueType,
} from '../../../../common/profiling';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { SearchBar } from '../../shared/search_bar';
import { ServiceProfilingFlamegraph } from './service_profiling_flamegraph';
import { ServiceProfilingTimeline } from './service_profiling_timeline';

interface ServiceProfilingProps {
  serviceName: string;
  environment?: string;
}

export function ServiceProfiling({
  serviceName,
  environment,
}: ServiceProfilingProps) {
  const {
    urlParams: { kuery, start, end },
  } = useUrlParams();

  const { data = [] } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/profiling/timeline',
        params: {
          path: { serviceName },
          query: {
            kuery,
            start,
            end,
            environment,
          },
        },
      });
    },
    [kuery, start, end, serviceName, environment]
  );

  const [valueType, setValueType] = useState<ProfilingValueType | undefined>();

  useEffect(() => {
    if (!data.length) {
      return;
    }

    const availableValueTypes = data.reduce((set, point) => {
      (Object.keys(point.valueTypes).filter(
        (type) => type !== 'unknown'
      ) as ProfilingValueType[])
        .filter((type) => point.valueTypes[type] > 0)
        .forEach((type) => {
          set.add(type);
        });

      return set;
    }, new Set<ProfilingValueType>());

    if (!valueType || !availableValueTypes.has(valueType)) {
      setValueType(Array.from(availableValueTypes)[0]);
    }
  }, [data, valueType]);

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
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <ServiceProfilingTimeline
                    start={start!}
                    end={end!}
                    series={data}
                    onValueTypeSelect={(type) => {
                      setValueType(type);
                    }}
                    selectedValueType={valueType}
                  />
                </EuiFlexItem>
                {valueType ? (
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h3>{getValueTypeConfig(valueType).label}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem>
                  <ServiceProfilingFlamegraph
                    serviceName={serviceName}
                    environment={environment}
                    valueType={valueType}
                    start={start}
                    end={end}
                    kuery={kuery}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
