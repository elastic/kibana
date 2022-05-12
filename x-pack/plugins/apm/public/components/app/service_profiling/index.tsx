/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import {
  getValueTypeConfig,
  ProfilingValueType,
} from '../../../../common/profiling';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ServiceProfilingFlamegraph } from './service_profiling_flamegraph';
import { ServiceProfilingTimeline } from './service_profiling_timeline';

type ApiResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/profiling/timeline'>;
const DEFAULT_DATA: ApiResponse = { profilingTimeline: [] };

export function ServiceProfiling() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/profiling');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = DEFAULT_DATA } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi(
        'GET /internal/apm/services/{serviceName}/profiling/timeline',
        {
          params: {
            path: { serviceName },
            query: {
              kuery,
              start,
              end,
              environment,
            },
          },
        }
      );
    },
    [kuery, start, end, serviceName, environment]
  );

  const { profilingTimeline } = data;

  const [valueType, setValueType] = useState<ProfilingValueType | undefined>();

  useEffect(() => {
    if (!profilingTimeline.length) {
      return;
    }

    const availableValueTypes = profilingTimeline.reduce((set, point) => {
      (
        Object.keys(point.valueTypes).filter(
          (type) => type !== 'unknown'
        ) as ProfilingValueType[]
      )
        .filter((type) => point.valueTypes[type] > 0)
        .forEach((type) => {
          set.add(type);
        });

      return set;
    }, new Set<ProfilingValueType>());

    if (!valueType || !availableValueTypes.has(valueType)) {
      setValueType(Array.from(availableValueTypes)[0]);
    }
  }, [profilingTimeline, valueType]);

  return (
    <>
      <EuiPanel>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <ServiceProfilingTimeline
              start={start!}
              end={end!}
              series={profilingTimeline}
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
    </>
  );
}
