/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { CONTAINER_ID, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';

export function ServiceLogs() {
  const {
    services: { logsShared, uiSettings },
  } = useKibana();

  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}/logs');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const timeRange = useMemo(() => ({ start, end }), [start, end]);

  const { data: assetFilter, status } = useFetcher(
    async (callApmApi) => {
      if (start == null || end == null) {
        return;
      }

      const { containerIds } = await callApmApi(
        'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
        {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        }
      );

      return getInfrastructureFilter({ containerIds, environment, serviceName });
    },
    [environment, kuery, serviceName, start, end]
  );

  const logFilters = useMemo(() => {
    return [
      ...(assetFilter != null ? [assetFilter] : []),
      buildEsQuery(
        undefined,
        {
          language: 'kuery',
          query: kuery,
        },
        [],
        getEsQueryConfig(uiSettings)
      ),
    ];
  }, [assetFilter, kuery, uiSettings]);

  if (status === FETCH_STATUS.SUCCESS || (status === FETCH_STATUS.LOADING && logFilters != null)) {
    return (
      <logsShared.LogsOverview documentFilters={logFilters} timeRange={timeRange} height="60vh" />
    );
  } else if (status === FETCH_STATUS.FAILURE) {
    return (
      <logsShared.LogsOverview.ErrorContent error={new Error('Failed to fetch service details')} />
    );
  } else {
    return <logsShared.LogsOverview.LoadingContent />;
  }
}

export function getInfrastructureFilter({
  containerIds,
  environment,
  serviceName,
}: {
  containerIds: string[];
  environment: string;
  serviceName: string;
}): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        ...getServiceShouldClauses({ environment, serviceName }),
        ...getContainerShouldClauses({ containerIds }),
      ],
      minimum_should_match: 1,
    },
  };
}

export function getServiceShouldClauses({
  environment,
  serviceName,
}: {
  environment: string;
  serviceName: string;
}): QueryDslQueryContainer[] {
  const serviceNameFilter: QueryDslQueryContainer = {
    term: {
      [SERVICE_NAME]: serviceName,
    },
  };

  if (environment === ENVIRONMENT_ALL.value) {
    return [serviceNameFilter];
  } else {
    return [
      {
        bool: {
          filter: [
            serviceNameFilter,
            {
              term: {
                [SERVICE_ENVIRONMENT]: environment,
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [serviceNameFilter],
          must_not: [
            {
              exists: {
                field: SERVICE_ENVIRONMENT,
              },
            },
          ],
        },
      },
    ];
  }
}

export function getContainerShouldClauses({
  containerIds = [],
}: {
  containerIds: string[];
}): QueryDslQueryContainer[] {
  if (containerIds.length === 0) {
    return [];
  }

  return [
    {
      bool: {
        filter: [
          {
            terms: {
              [CONTAINER_ID]: containerIds,
            },
          },
        ],
        must_not: [
          {
            term: {
              [SERVICE_NAME]: '*',
            },
          },
        ],
      },
    },
  ];
}
