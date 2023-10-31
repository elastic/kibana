/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { getNodeName, NodeType } from '../../../../../common/connections';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { DependencyLink } from '../../../shared/links/dependency_link';
import { DependenciesTable } from '../../../shared/dependencies_table';

export function DependenciesInventoryTable() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      comparisonEnabled,
      offset,
    },
  } = useApmParams('/dependencies/inventory');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const trackEvent = useUiTracker();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi('GET /internal/apm/dependencies/top_dependencies', {
        params: {
          query: {
            start,
            end,
            environment,
            numBuckets: 20,
            offset:
              comparisonEnabled && isTimeComparison(offset)
                ? offset
                : undefined,
            kuery,
          },
        },
      });
    },
    [start, end, environment, offset, kuery, comparisonEnabled]
  );

  const dependencies =
    data?.dependencies.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);

      if (location.type !== NodeType.dependency) {
        throw new Error('Expected a dependency node');
      }
      const link = (
        <DependencyLink
          type={location.spanType}
          subtype={location.spanSubtype}
          query={{
            dependencyName: location.dependencyName,
            comparisonEnabled,
            offset,
            environment,
            kuery,
            rangeFrom,
            rangeTo,
          }}
          onClick={() => {
            trackEvent({
              app: 'apm',
              metricType: METRIC_TYPE.CLICK,
              metric: 'dependencies_inventory_to_dependency_detail',
            });
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
      title={null}
      nameColumnTitle={i18n.translate(
        'xpack.apm.dependenciesInventory.dependencyTableColumn',
        {
          defaultMessage: 'Dependency',
        }
      )}
      status={status}
      compact={false}
      initialPageSize={25}
    />
  );
}
