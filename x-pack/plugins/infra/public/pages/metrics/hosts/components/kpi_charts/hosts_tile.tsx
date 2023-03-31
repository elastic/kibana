/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useRef } from 'react';

import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { type ChartBaseProps, KPIChart, AcceptedType } from './kpi_chart';

export interface HostsTileProps extends Omit<ChartBaseProps, 'type'> {
  type: Extract<AcceptedType, 'hostsCount'>;
}

export const HostsTile = ({ type, ...props }: HostsTileProps) => {
  const renderedRef = useRef(false);
  const { hostNodes, loading } = useHostsViewContext();

  const hostsCount = useMemo(() => hostNodes.length, [hostNodes.length]);

  useEffect(() => {
    if (!loading && !renderedRef.current) {
      renderedRef.current = true;
    }
  }, [loading]);

  return (
    <KPIChart
      id={`$metric-${type}`}
      type={type}
      nodes={[]}
      loading={!renderedRef.current}
      overrideValue={hostsCount}
      {...props}
    />
  );
};
