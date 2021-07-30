/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React, { MouseEvent } from 'react';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { ServiceStatsFetcher } from '../ServiceStatsFetcher';

interface ServiceProps {
  onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeData: cytoscape.NodeDataDefinition;
}

export function Service({ onFocusClick, selectedNodeData }: ServiceProps) {
  const { query } = useApmParams('/service-map');
  const apmRouter = useApmRouter();

  const serviceName = selectedNodeData.id!;

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
          serviceAnomalyStats={selectedNodeData.serviceAnomalyStats}
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
