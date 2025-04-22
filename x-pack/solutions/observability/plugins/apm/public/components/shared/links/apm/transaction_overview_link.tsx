/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config/src/types';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import type { APMLinkExtendProps } from './apm_link_hooks';
import type { ApmRoutes } from '../../../routing/apm_route_config';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
  transactionType?: string;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/transactions'>['query'];
}

export function TransactionOverviewLink({
  serviceName,
  latencyAggregationType,
  transactionType,
  query,
  ...rest
}: Props) {
  const { link } = useApmRouter();

  const href = link('/services/{serviceName}/transactions', {
    path: { serviceName },
    query: {
      ...query,
      latencyAggregationType,
      transactionType: transactionType ?? query.transactionType,
    },
  });

  return <EuiLink data-test-subj="apmTransactionOverviewLinkLink" href={href} {...rest} />;
}
