/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { LogStream } from '@kbn/infra-plugin/public';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';

import {
  CONTAINER_ID,
  HOST_NAME,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

export function ServiceLogs() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/logs');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi(
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
      query={getInfrastructureKQLFilter(data, serviceName)}
      showFlyoutAction
    />
  );
}

export const getInfrastructureKQLFilter = (
  data:
    | APIReturnType<'GET /internal/apm/services/{serviceName}/infrastructure_attributes'>
    | undefined,
  serviceName: string
) => {
  const containerIds = data?.containerIds ?? [];
  const hostNames = data?.hostNames ?? [];

  const infraAttributes = containerIds.length
    ? containerIds.map((id) => `${CONTAINER_ID}: "${id}"`)
    : hostNames.map((id) => `${HOST_NAME}: "${id}"`);

  const infraAttributesJoined = infraAttributes.join(' or ');

  return infraAttributes.length
    ? `${SERVICE_NAME}: "${serviceName}" or (not ${SERVICE_NAME} and (${infraAttributesJoined}))`
    : `${SERVICE_NAME}: "${serviceName}"`;
};
