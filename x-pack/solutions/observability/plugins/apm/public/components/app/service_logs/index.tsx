/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { CONTAINER_ID, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';

export function ServiceLogs() {
  const {
    services: {
      logsShared: { LogsOverview },
    },
  } = useKibana();

  const isLogsOverviewEnabled = LogsOverview.useIsEnabled();

  if (isLogsOverviewEnabled) {
    return <ServiceLogsOverview />;
  } else {
    return <ClassicServiceLogsStream />;
  }
}

export function ClassicServiceLogsStream() {
  const {
    services: {
      logsDataAccess: {
        services: { logSourcesService },
      },
      embeddable,
      dataViews,
      data: {
        search: { searchSource },
      },
    },
  } = useKibana();

  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}/logs', '/mobile-services/{serviceName}/logs');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services/{serviceName}/infrastructure_attributes', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end]
  );

  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const timeRange = useMemo(() => ({ from: start, to: end }), [start, end]);

  const query = useMemo(
    () => ({
      language: 'kuery',
      query: getInfrastructureKQLFilter({ data, serviceName, environment }),
    }),
    [data, serviceName, environment]
  );

  return logSources.value ? (
    <LazySavedSearchComponent
      dependencies={{ embeddable, searchSource, dataViews }}
      index={logSources.value}
      timeRange={timeRange}
      query={query}
      height={'60vh'}
      displayOptions={{
        solutionNavIdOverride: 'oblt',
        enableDocumentViewer: true,
        enableFilters: false,
      }}
    />
  ) : null;
}

export function ServiceLogsOverview() {
  const {
    services: { logsShared },
  } = useKibana();
  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}/logs');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const timeRange = useMemo(() => ({ start, end }), [start, end]);

  const { data: logFilters, status } = useFetcher(
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

      return [getInfrastructureFilter({ containerIds, environment, serviceName })];
    },
    [environment, kuery, serviceName, start, end]
  );

  if (status === FETCH_STATUS.SUCCESS) {
    return <logsShared.LogsOverview documentFilters={logFilters} timeRange={timeRange} />;
  } else if (status === FETCH_STATUS.FAILURE) {
    return (
      <logsShared.LogsOverview.ErrorContent error={new Error('Failed to fetch service details')} />
    );
  } else {
    return <logsShared.LogsOverview.LoadingContent />;
  }
}

export function getInfrastructureKQLFilter({
  data,
  serviceName,
  environment,
}: {
  data:
    | APIReturnType<'GET /internal/apm/services/{serviceName}/infrastructure_attributes'>
    | undefined;
  serviceName: string;
  environment: string;
}) {
  const serviceNameAndEnvironmentCorrelation =
    environment === ENVIRONMENT_ALL.value
      ? `${SERVICE_NAME}: "${serviceName}"` // correlate on service.name only
      : `(${SERVICE_NAME}: "${serviceName}" and ${SERVICE_ENVIRONMENT}: "${environment}") or (${SERVICE_NAME}: "${serviceName}" and not ${SERVICE_ENVIRONMENT}: *)`; // correlate on service.name + service.environment

  // correlate on container.id
  const containerIdKql = (data?.containerIds ?? [])
    .map((id) => `${CONTAINER_ID}: "${id}"`)
    .join(' or ');
  const containerIdCorrelation = containerIdKql
    ? [`((${containerIdKql}) and not ${SERVICE_NAME}: *)`]
    : [];

  return [serviceNameAndEnvironmentCorrelation, ...containerIdCorrelation].join(' or ');
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
