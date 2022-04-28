/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import {
  EuiButton,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import type { ContentsProps } from '.';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { AnomalyDetection } from './anomaly_detection';
import { StatsList } from './stats_list';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type ServiceNodeReturn =
  APIReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;

const INITIAL_STATE: ServiceNodeReturn = {
  currentPeriod: {},
  previousPeriod: undefined,
};

export function ServiceContents({
  onFocusClick,
  nodeData,
  environment,
  kuery,
}: ContentsProps) {
  const apmRouter = useApmRouter();

  const { query } = useApmParams('/*');

  if (
    !('rangeFrom' in query && 'rangeTo' in query) ||
    !query.rangeFrom ||
    !query.rangeTo
  ) {
    throw new Error('Expected rangeFrom and rangeTo to be set');
  }

  const { rangeFrom, rangeTo, comparisonEnabled, offset } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const serviceName = nodeData.id!;
  const serviceGroup = ('serviceGroup' in query && query.serviceGroup) || '';

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi(
          'GET /internal/apm/service-map/service/{serviceName}',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                start,
                end,
                offset: comparisonEnabled ? offset : undefined,
              },
            },
          }
        );
      }
    },
    [environment, serviceName, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  const detailsUrl = apmRouter.link('/services/{serviceName}', {
    path: { serviceName },
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      comparisonEnabled,
      serviceGroup,
    },
  });

  const focusUrl = apmRouter.link('/services/{serviceName}/service-map', {
    path: { serviceName },
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      comparisonEnabled,
    },
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
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton color="success" href={focusUrl} onClick={onFocusClick}>
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
