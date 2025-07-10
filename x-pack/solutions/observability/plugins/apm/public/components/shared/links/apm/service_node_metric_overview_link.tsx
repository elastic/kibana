/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import type { APMQueryParams } from '../url_helpers';
import type { APMLinkExtendProps } from './apm_link_hooks';
import { useAPMHref } from './apm_link_hooks';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  serviceNodeName: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

export function useServiceNodeMetricOverviewHref({
  serviceName,
  serviceNodeName,
}: {
  serviceName: string;
  serviceNodeName: string;
}) {
  return useAPMHref({
    path: '/services/{serviceName}/metrics/{serviceNodeName}',
    pathParams: { serviceName, serviceNodeName },
    persistedFilters,
  });
}

export function ServiceNodeMetricOverviewLink({ serviceName, serviceNodeName, ...rest }: Props) {
  const href = useServiceNodeMetricOverviewHref({
    serviceName,
    serviceNodeName,
  });
  return <EuiLink data-test-subj="apmServiceNodeMetricOverviewLinkLink" href={href} {...rest} />;
}
