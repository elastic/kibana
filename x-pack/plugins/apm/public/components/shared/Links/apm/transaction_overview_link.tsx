/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { APMLinkExtendProps, getAPMHref } from './APMLink';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  latencyAggregationType?: string;
}

export function useTransactionsOverviewHref({
  serviceName,
  latencyAggregationType,
}: {
  serviceName: string;
  latencyAggregationType?: string;
}) {
  const { core } = useApmPluginContext();
  const location = useLocation();
  const { search } = location;

  return getAPMHref({
    basePath: core.http.basePath,
    path: `/services/${serviceName}/transactions`,
    query: { ...(latencyAggregationType ? { latencyAggregationType } : {}) },
    search,
  });
}

export function TransactionOverviewLink({
  serviceName,
  latencyAggregationType,
  ...rest
}: Props) {
  const href = useTransactionsOverviewHref({
    serviceName,
    latencyAggregationType,
  });
  return <EuiLink href={href} {...rest} />;
}
