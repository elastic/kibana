/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { getNodeName, NodeType } from '../../../../../common/connections';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { DependenciesTable } from '../../../shared/dependencies_table';
import { BackendLink } from '../../../shared/backend_link';
import { DependenciesTableServiceMapLink } from '../../../shared/dependencies_table/dependencies_table_service_map_link';

export function BackendInventoryDependenciesTable() {
  const {
    urlParams: { start, end, environment, comparisonEnabled, comparisonType },
  } = useUrlParams();

  const {
    query: { rangeFrom, rangeTo, kuery },
  } = useApmParams('/backends');

  const router = useApmRouter();
  const serviceMapLink = router.link('/service-map', {
    query: {
      rangeFrom,
      rangeTo,
      environment,
    },
  });

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
        'xpack.apm.backendInventory.dependenciesTableTitle',
        {
          defaultMessage: 'Backends',
        }
      )}
      nameColumnTitle={i18n.translate(
        'xpack.apm.backendInventory.dependenciesTableColumnBackend',
        {
          defaultMessage: 'Backend',
        }
      )}
      status={status}
      compact={false}
      link={<DependenciesTableServiceMapLink href={serviceMapLink} />}
    />
  );
}
