/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { getNodeName, NodeType } from '../../../../../common/connections';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { BackendLink } from '../../../shared/backend_link';
import { DependenciesTable } from '../../../shared/dependencies_table';
import { ServiceLink } from '../../../shared/service_link';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';

export function ServiceOverviewDependenciesTable() {
  const {
    urlParams: {
      start,
      end,
      environment,
      comparisonEnabled,
      comparisonType,
      latencyAggregationType,
    },
  } = useUrlParams();

  const {
    query: { kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/:serviceName/overview');

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const { serviceName, transactionType } = useApmServiceContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
        params: {
          path: { serviceName },
          query: { start, end, environment, numBuckets: 20, offset },
        },
      });
    },
    [start, end, serviceName, environment, offset]
  );

  const dependencies =
    data?.serviceDependencies.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);
      const link =
        location.type === NodeType.backend ? (
          <BackendLink
            backendName={location.backendName}
            type={location.spanType}
            subtype={location.spanSubtype}
            query={{
              comparisonEnabled: comparisonEnabled ? 'true' : 'false',
              comparisonType,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
            }}
          />
        ) : (
          <ServiceLink
            serviceName={location.serviceName}
            agentName={location.agentName}
            query={{
              comparisonEnabled: comparisonEnabled ? 'true' : 'false',
              comparisonType,
              environment,
              kuery,
              rangeFrom,
              rangeTo,
              latencyAggregationType,
              transactionType,
            }}
          />
        );

      return {
        name,
        currentStats: dependency.currentStats,
        previousStats: dependency.previousStats,
        link,
      };
    }) ?? [];

  return (
    <DependenciesTable
      dependencies={dependencies}
      title={i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableTitle',
        {
          defaultMessage: 'Dependencies',
        }
      )}
      nameColumnTitle={i18n.translate(
        'xpack.apm.serviceOverview.dependenciesTableColumnBackend',
        {
          defaultMessage: 'Backend',
        }
      )}
      serviceName={serviceName}
      status={status}
    />
  );
}
