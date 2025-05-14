/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { EuiLink } from '@elastic/eui';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import type { APMQueryParams } from '../url_helpers';
import { useAPMHref } from './apm_link_hooks';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { APMLinkExtendProps } from './apm_link_hooks';

const persistedFilters: Array<keyof APMQueryParams> = [
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

export function useMetricOverviewHref(serviceName: string) {
  return useAPMHref({
    path: `/services/{serviceName}/metrics`,
    pathParams: { serviceName },
    persistedFilters,
  });
}

interface Props extends APMLinkExtendProps {
  serviceName: string;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/metrics'>['query'];
}

export function MetricOverviewLink({ serviceName, query, ...rest }: Props) {
  const { link } = useApmRouter();
  const metricsOverviewLink = link('/services/{serviceName}/metrics', {
    path: {
      serviceName,
    },
    query,
  });
  return <EuiLink data-test-subj="apmMetricsOverviewLink" href={metricsOverviewLink} {...rest} />;
}
