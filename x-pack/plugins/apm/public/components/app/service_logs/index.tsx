/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { LogStream } from '../../../../../infra/public';
import { APIReturnType } from '../../../services/rest/createCallApmApi';

import {
  CONTAINER_ID,
  HOSTNAME,
  POD_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { useApmParams } from '../../../hooks/use_apm_params';

export function ServiceLogs() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, kuery },
  } = useApmParams('/services/:serviceName/logs');

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/infrastructure',
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

  const noInfrastructureData = useMemo(() => {
    return (
      isEmpty(data?.serviceInfrastructure?.containerIds) &&
      isEmpty(data?.serviceInfrastructure?.hostNames) &&
      isEmpty(data?.serviceInfrastructure?.podNames)
    );
  }, [data]);

  if (status === FETCH_STATUS.LOADING) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="m" />
      </div>
    );
  }

  if (status === FETCH_STATUS.SUCCESS && noInfrastructureData) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.apm.serviceLogs.noInfrastructureMessage', {
              defaultMessage: 'There are no log messages to display.',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <LogStream
      columns={[{ type: 'timestamp' }, { type: 'message' }]}
      height={'60vh'}
      startTimestamp={moment(start).valueOf()}
      endTimestamp={moment(end).valueOf()}
      query={getInfrastructureKQLFilter(data)}
    />
  );
}

const getInfrastructureKQLFilter = (
  data?: APIReturnType<'GET /api/apm/services/{serviceName}/infrastructure'>
) => {
  const containerIds = data?.serviceInfrastructure?.containerIds ?? [];
  const hostNames = data?.serviceInfrastructure?.hostNames ?? [];
  const podNames = data?.serviceInfrastructure?.podNames ?? [];

  return [
    ...containerIds.map((id) => `${CONTAINER_ID}: "${id}"`),
    ...hostNames.map((id) => `${HOSTNAME}: "${id}"`),
    ...podNames.map((id) => `${POD_NAME}: "${id}"`),
  ].join(' or ');
};
