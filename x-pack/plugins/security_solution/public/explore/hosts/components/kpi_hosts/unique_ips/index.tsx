/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiUniqueIpsAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_area';
import { kpiUniqueIpsBarLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_bar';
import { kpiUniqueIpsDestinationMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_destination_metric';
import { kpiUniqueIpsSourceMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_source_metric';
import { KpiBaseComponent } from '../../../../components/kpi';
import type { HostsKpiProps } from '../types';
import { HostsKpiChartColors } from '../types';
import * as i18n from './translations';

export const ID = 'hostsKpiUniqueIpsQuery';

export const uniqueIpsStatItems: Readonly<StatItems[]> = [
  {
    key: 'uniqueIps',
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        color: HostsKpiChartColors.uniqueSourceIps,
        icon: 'visMapCoordinate',
        lensAttributes: kpiUniqueIpsSourceMetricLensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        color: HostsKpiChartColors.uniqueDestinationIps,
        icon: 'visMapCoordinate',
        lensAttributes: kpiUniqueIpsDestinationMetricLensAttributes,
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    description: i18n.UNIQUE_IPS,
    areaChartLensAttributes: kpiUniqueIpsAreaLensAttributes,
    barChartLensAttributes: kpiUniqueIpsBarLensAttributes,
  },
];

const HostsKpiUniqueIpsComponent: React.FC<HostsKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent from={from} id={ID} statItems={uniqueIpsStatItems} to={to} />;
};

export const HostsKpiUniqueIps = React.memo(HostsKpiUniqueIpsComponent);
