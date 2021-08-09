/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ContentsProps } from '.';
import { NodeStats } from '../../../../../common/service_map';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { AnomalyDetection } from './anomaly_detection';
import { StatsList } from './stats_list';

export function ServiceContents({ onFocusClick, nodeData }: ContentsProps) {
  const apmRouter = useApmRouter();

  const {
    urlParams: { environment, start, end },
  } = useUrlParams();

  const serviceName = nodeData.id!;

  const { data = { transactionStats: {} } as NodeStats, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/service-map/service/{serviceName}',
          params: {
            path: { serviceName },
            query: { environment, start, end },
          },
        });
      }
    },
    [environment, serviceName, start, end],
    {
      preservePreviousData: false,
    }
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  const detailsUrl = apmRouter.link('/services/:serviceName', {
    path: { serviceName },
  });

  const focusUrl = apmRouter.link('/services/:serviceName/service-map', {
    path: { serviceName },
  });

  const { serviceAnomalyStats } = nodeData;

  return (
    <>
      <EuiFlexItem>
        {serviceAnomalyStats && (
          <>
            <AnomalyDetection
              serviceName={serviceName}
              serviceAnomalyStats={serviceAnomalyStats}
            />
            <EuiHorizontalRule margin="xs" />
          </>
        )}
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton color="secondary" href={focusUrl} onClick={onFocusClick}>
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
