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
import { useFetcher } from '../../../hooks/use_fetcher';
import { DependenciesTable } from '../../shared/dependencies_table';
import { ServiceLink } from '../../shared/service_link';
import { useTimeRange } from '../../../hooks/use_time_range';

export function BackendDetailDependenciesTable() {
  const {
    query: {
      backendName,
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      comparisonEnabled,
      offset,
    },
  } = useApmParams('/backends/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/backends/upstream_services', {
        params: {
          query: {
            backendName,
            start,
            end,
            environment,
            numBuckets: 20,
            offset: comparisonEnabled ? offset : undefined,
            kuery,
          },
        },
      });
    },
    [start, end, environment, offset, backendName, kuery, comparisonEnabled]
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
              offset,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
              latencyAggregationType: undefined,
              transactionType: undefined,
              serviceGroup: '',
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
