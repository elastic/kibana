/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, useAPMHref } from './APMLink';

interface Props extends APMLinkExtendProps {
  serviceName: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'latencyAggregationType',
];

export function useTransactionsOverviewHref(serviceName: string) {
  return useAPMHref(`/services/${serviceName}/transactions`, persistedFilters);
}

export function TransactionOverviewLink({ serviceName, ...rest }: Props) {
  const href = useTransactionsOverviewHref(serviceName);
  return <EuiLink href={href} {...rest} />;
}
