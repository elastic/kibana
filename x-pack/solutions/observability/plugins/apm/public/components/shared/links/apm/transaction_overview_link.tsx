/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { removeUndefinedProps } from '../../../../context/url_params_context/helpers';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { APMLinkExtendProps } from './apm_link_hooks';
import { getLegacyApmHref } from './apm_link_hooks';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  latencyAggregationType?: string;
  transactionType?: string;
}

// TODO remove legacy and refactor
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
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview'
  );
  const apmRouter = useApmRouter();

  const href = apmRouter.link('/services/{serviceName}/transactions', {
    path: { serviceName },
    query,
  });

  return <EuiLink data-test-subj="apmTransactionOverviewLinkLink" href={href} {...rest} />;
}
