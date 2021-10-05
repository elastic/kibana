/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUiTracker } from '../../../../../../observability/public';
import { getNodeName, NodeType } from '../../../../../common/connections';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { BackendLink } from '../../../shared/backend_link';
import { DependenciesTable } from '../../../shared/dependencies_table';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';

export function BackendInventoryDependenciesTable() {
  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useUrlParams();

  const {
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/backends');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const trackEvent = useUiTracker();

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
        endpoint: 'GET /api/apm/backends/top_backends',
        params: {
          query: { start, end, environment, numBuckets: 20, offset, kuery },
        },
      });
    },
    [start, end, environment, offset, kuery]
  );

  const dependencies =
    data?.backends.map((dependency) => {
      const { location } = dependency;
      const name = getNodeName(location);

      if (location.type !== NodeType.backend) {
        throw new Error('Expected a backend node');
      }
      const link = (
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
          onClick={() => {
            trackEvent({
              app: 'apm',
              metricType: METRIC_TYPE.CLICK,
              metric: 'backend_inventory_to_backend_detail',
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
        'xpack.apm.backendInventory.dependencyTableColumn',
        {
          defaultMessage: 'Dependency',
        }
      )}
      status={status}
      compact={false}
    />
  );
}
