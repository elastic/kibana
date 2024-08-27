/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

import { CONTAINER_ID, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

export function ServiceLogs() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}/logs', '/logs-services/{serviceName}/logs');

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

  return (
    <LogStream
      logView={{ type: 'log-view-reference', logViewId: 'default' }}
      columns={[{ type: 'timestamp' }, { type: 'message' }]}
      height={'60vh'}
      startTimestamp={moment(start).valueOf()}
      endTimestamp={moment(end).valueOf()}
      query={getInfrastructureKQLFilter({ data, serviceName, environment })}
      showFlyoutAction
    />
  );
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
