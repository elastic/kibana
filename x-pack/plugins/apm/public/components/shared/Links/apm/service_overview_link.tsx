/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, useAPMHref } from './APMLink';

interface ServiceOverviewLinkProps extends APMLinkExtendProps {
  serviceName: string;
  environment?: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'latencyAggregationType',
];

export function useServiceOverviewHref(
  serviceName: string,
  environment?: string
) {
  const query = environment
    ? {
        environment,
      }
    : {};
  return useAPMHref({
    path: `/services/${serviceName}/overview`,
    persistedFilters,
    query,
  });
}

export function ServiceOverviewLink({
  serviceName,
  environment,
  ...rest
}: ServiceOverviewLinkProps) {
  const href = useServiceOverviewHref(serviceName, environment);
  return <EuiLink href={href} {...rest} />;
}
