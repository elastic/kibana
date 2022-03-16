/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, useAPMHref } from './apm_link';

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
    path: `/services/${serviceName}/nodes/${encodeURIComponent(
      serviceNodeName
    )}/metrics`,
    persistedFilters,
  });
}

export function ServiceNodeMetricOverviewLink({
  serviceName,
  serviceNodeName,
  ...rest
}: Props) {
  const href = useServiceNodeMetricOverviewHref({
    serviceName,
    serviceNodeName,
  });
  return <EuiLink href={href} {...rest} />;
}
