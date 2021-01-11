/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, useAPMHref } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = [
  'transactionResult',
  'host',
  'containerId',
  'podName',
  'serviceVersion',
  'latencyAggregationType',
];

export function useServiceOrTransactionsOverviewHref(serviceName: string) {
  return useAPMHref(`/services/${serviceName}`, persistedFilters);
}

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

export function ServiceOrTransactionsOverviewLink({
  serviceName,
  ...rest
}: Props) {
  const href = useServiceOrTransactionsOverviewHref(serviceName);
  return <EuiLink href={href} {...rest} />;
}
