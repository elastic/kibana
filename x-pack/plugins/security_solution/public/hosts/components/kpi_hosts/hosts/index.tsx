/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { StatItems } from '../../../../common/components/stat_items';
import { kpiHostAreaLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_area';
import { kpiHostMetricLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_metric';
import { useHostsKpiHosts, ID } from '../../../containers/kpi_hosts/hosts';
import { KpiBaseComponentManage } from '../common';
import type { HostsKpiProps } from '../types';
import { HostsKpiChartColors } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
        value: null,
        color: HostsKpiChartColors.hosts,
        icon: 'storage',
        lensAttributes: kpiHostMetricLensAttributes,
      },
    ],
    enableAreaChart: true,
    description: i18n.HOSTS,
    areaChartLensAttributes: kpiHostAreaLensAttributes,
  },
];

const HostsKpiHostsComponent: React.FC<HostsKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  updateDateRange,
  setQuery,
  skip,
}) => {
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [loading, { refetch, id, inspect, ...data }] = useHostsKpiHosts({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip: querySkip,
  });

  return (
    <KpiBaseComponentManage
      data={data}
      id={id}
      inspect={inspect}
      loading={loading}
      fieldsMapping={fieldsMapping}
      from={from}
      to={to}
      updateDateRange={updateDateRange}
      refetch={refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
    />
  );
};

export const HostsKpiHosts = React.memo(HostsKpiHostsComponent);
