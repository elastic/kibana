/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiHostAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_area';
import { kpiHostMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_host_metric';
import { KpiBaseComponent } from '../../../../components/kpi';
import type { HostsKpiProps } from '../types';
import { HostsKpiChartColors } from '../types';
import * as i18n from './translations';

export const ID = 'hostsKpiHostsQuery';

export const hostsStatItems: Readonly<StatItems[]> = [
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
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

const HostsKpiHostsComponent: React.FC<HostsKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent id={ID} statItems={hostsStatItems} from={from} to={to} />;
};

export const HostsKpiHosts = React.memo(HostsKpiHostsComponent);
