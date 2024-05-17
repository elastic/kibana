/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { NodeType, getNodeName } from '../../../../common/connections';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DependenciesTable } from '../../shared/dependencies_table';
import { ServiceLink } from '../../shared/links/apm/service_link';
import { getComparisonEnabled } from '../../shared/time_comparison/get_comparison_enabled';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';

export function DependenciesDetailTable() {
  const {
    query: {
      dependencyName,
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      comparisonEnabled: urlComparisonEnabled,
      offset,
    },
  } = useApmParams('/dependencies/overview');

  const { core } = useApmPluginContext();

  const comparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/dependencies/upstream_services', {
        params: {
          query: {
            dependencyName,
            start,
            end,
            environment,
            numBuckets: 20,
            offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            kuery,
          },
        },
      });
    },
    [start, end, environment, offset, dependencyName, kuery, comparisonEnabled]
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
      title={i18n.translate('xpack.apm.dependencyDetail.dependenciesTableTitle', {
        defaultMessage: 'Upstream services',
      })}
      nameColumnTitle={i18n.translate('xpack.apm.dependencyDetail.dependenciesTableColumn', {
        defaultMessage: 'Service',
      })}
      status={status}
      compact={false}
      initialPageSize={25}
    />
  );
}
