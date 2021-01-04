/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { APMLink, APMLinkExtendProps } from './APMLink';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  latencyAggregationType?: LatencyAggregationType;
}

export function TransactionOverviewLink({
  serviceName,
  latencyAggregationType,
  ...rest
}: Props) {
  return (
    <APMLink
      path={`/services/${serviceName}/transactions/`}
      query={latencyAggregationType ? { latencyAggregationType } : {}}
      {...rest}
    />
  );
}
