/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { getNodeName, NodeType } from '../../../../common/connections';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { getTimeRangeComparison } from '../../shared/time_comparison/get_time_range_comparison';
import { DependenciesTable } from '../../shared/dependencies_table';
import { ServiceLink } from '../../shared/service_link';
import { useTimeRange } from '../../../hooks/use_time_range';

export function BackendDetailDependenciesTable() {
  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useLegacyUrlParams();

  const {
    query: { backendName, rangeFrom, rangeTo, kuery, environment },
  } = useApmParams('/backends/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /internal/apm/backends/upstream_services',
        params: {
          query: {
            backendName,
            start,
            end,
            environment,
            numBuckets: 20,
            offset,
            kuery,
          },
        },
      });
    },
    [start, end, environment, offset, backendName, kuery]
  );

  const dependencies =
    data?.services.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);

      if (location.type !== NodeType.service) {
        throw new Error('Expected a service node');
      }

      return {
        name,
        currentStats: dependency.currentStats,
        previousStats: dependency.previousStats,
        link: (
          <ServiceLink
            serviceName={location.serviceName}
            agentName={location.agentName}
            query={{
              comparisonEnabled,
              comparisonType,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
              latencyAggregationType: undefined,
              transactionType: undefined,
            }}
          />
        ),
      };
    }) ?? [];

  return (
    <DependenciesTable
      dependencies={dependencies}
      title={i18n.translate('xpack.apm.backendDetail.dependenciesTableTitle', {
        defaultMessage: 'Upstream services',
      })}
      nameColumnTitle={i18n.translate(
        'xpack.apm.backendDetail.dependenciesTableColumnBackend',
        {
          defaultMessage: 'Service',
        }
      )}
      status={status}
      compact={false}
    />
  );
}
