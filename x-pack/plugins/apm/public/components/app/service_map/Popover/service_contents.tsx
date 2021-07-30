/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ContentsProps } from '.';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ServiceStatsFetcher } from './service_stats_fetcher';

export function ServiceContents({ onFocusClick, nodeData }: ContentsProps) {
  const { query } = useApmParams('/service-map');
  const apmRouter = useApmRouter();

  const serviceName = nodeData.id!;

  const detailsUrl = apmRouter.link('/services/:serviceName', {
    path: { serviceName },
    query,
  });
  const focusUrl = apmRouter.link('/services/:serviceName/service-map', {
    path: { serviceName },
    query,
  });

  return (
    <>
      <EuiFlexItem>
        <ServiceStatsFetcher
          serviceName={serviceName}
          serviceAnomalyStats={nodeData.serviceAnomalyStats}
        />
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
