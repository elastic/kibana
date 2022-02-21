/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { APMLinkExtendProps, getLegacyApmHref } from './apm_link';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  latencyAggregationType?: string;
  transactionType?: string;
}

export function useTransactionsOverviewHref({
  serviceName,
  latencyAggregationType,
  transactionType,
}: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();
  const { search } = location;

  const query = { latencyAggregationType, transactionType };

  return getLegacyApmHref({
    basePath: core.http.basePath,
    path: `/services/${serviceName}/transactions`,
    query: removeUndefinedProps(query),
    search,
  });
}

export function TransactionOverviewLink({
  serviceName,
  latencyAggregationType,
  transactionType,
  ...rest
}: Props) {
  const href = useTransactionsOverviewHref({
    serviceName,
    latencyAggregationType,
    transactionType,
  });
  return <EuiLink href={href} {...rest} />;
}
