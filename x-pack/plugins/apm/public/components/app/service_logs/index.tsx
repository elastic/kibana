/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { LogStream } from '../../../../../infra/public';

export function ServiceLogs() {
  const { serviceName } = useApmServiceContext();
  const {
    urlParams: { environment, kuery, start, end },
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
    const containerIdsLength =
      data?.serviceInfrastructure?.containerIds?.length ?? 0;
    const hostNamesLength = data?.serviceInfrastructure?.hostNames?.length ?? 0;
    const podNamesLength = data?.serviceInfrastructure?.podNames?.length ?? 0;
    return (
      containerIdsLength === 0 && hostNamesLength === 0 && podNamesLength === 0
    );
  }, [data]);

  return status === FETCH_STATUS.LOADING ? (
    <div style={{ textAlign: 'center' }}>
      <EuiLoadingSpinner size="m" />
    </div>
  ) : status === FETCH_STATUS.SUCCESS && noInfrastructureData ? (
    <EuiEmptyPrompt
      title={
        <h2>
          {i18n.translate('xpack.apm.serviceLogs.noInfrastructureMessage', {
            defaultMessage: 'There are no log messages to display.',
          })}
        </h2>
      }
    />
  ) : (
    <LogStream
      height={'60vh'}
      startTimestamp={moment(start).valueOf()}
      endTimestamp={moment(end).valueOf()}
      query={`
       ${
         (data?.serviceInfrastructure?.containerIds?.length ?? 0) > 0
           ? `container.id : ${data?.serviceInfrastructure.containerIds
               .map((id) => `"${id}"`)
               .join(' or container.id : ')}`
           : ''
       } ${
        (data?.serviceInfrastructure?.hostNames?.length ?? 0) > 0
          ? `or host.name : ${data?.serviceInfrastructure.hostNames
              .map((hostName) => `"${hostName}"`)
              .join(' or host.name : ')}`
          : ''
      } ${
        (data?.serviceInfrastructure?.podNames?.length ?? 0) > 0
          ? `or kubernetes.pod.name : ${data?.serviceInfrastructure.podNames
              .map((podName) => `"${podName}"`)
              .join(' or kubernetes.pod.name : ')}`
          : ''
      }
      `}
    />
  );
}
