/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, useAPMHref } from './APMLink';

interface ServiceOverviewLinkProps extends APMLinkExtendProps {
  serviceName: string;
  environment?: string;
  transactionType?: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'latencyAggregationType',
];

export function useServiceOverviewHref({
  serviceName,
  environment,
  transactionType,
}: ServiceOverviewLinkProps) {
  const query = { environment, transactionType };
  return useAPMHref({
    path: `/services/${serviceName}/overview`,
    persistedFilters,
    query: removeUndefinedProps(query),
  });
}

export function ServiceOverviewLink({
  serviceName,
  environment,
  transactionType,
  ...rest
}: ServiceOverviewLinkProps) {
  const href = useServiceOverviewHref({
    serviceName,
    environment,
    transactionType,
  });
  return <EuiLink href={href} {...rest} />;
}
