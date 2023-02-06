/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { type ChartBaseProps, KPIChart } from './kpi_chart';

export const HostsTile = ({ type, ...props }: ChartBaseProps) => {
  const { hostViewState } = useHostsViewContext();

  return (
    <KPIChart
      id={`$metric-${type}`}
      type={type}
      nodes={[]}
      loading={hostViewState.loading}
      overrideValue={hostViewState?.totalHits}
      {...props}
    />
  );
};
