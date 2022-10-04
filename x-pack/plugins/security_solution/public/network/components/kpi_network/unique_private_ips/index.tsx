/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';

import type { StatItems } from '../../../../common/components/stat_items';
import { ID } from '../../../containers/kpi_network/unique_private_ips';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { kpiUniquePrivateIpsSourceMetricLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_source_metric';
import { kpiUniquePrivateIpsDestinationMetricLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_destination_metric';
import { kpiUniquePrivateIpsAreaLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_area';
import { kpiUniquePrivateIpsBarLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_bar';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common/kpi_embeddable_component';

const euiVisColorPalette = euiPaletteColorBlind();
const euiColorVis2 = euiVisColorPalette[2];
const euiColorVis3 = euiVisColorPalette[3];

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        lensAttributes: kpiUniquePrivateIpsSourceMetricLensAttributes,
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        lensAttributes: kpiUniquePrivateIpsDestinationMetricLensAttributes,
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
    areaChartLensAttributes: kpiUniquePrivateIpsAreaLensAttributes,
    barChartLensAttributes: kpiUniquePrivateIpsBarLensAttributes,
  },
];

const NetworkKpiUniquePrivateIpsComponent: React.FC<NetworkKpiProps> = ({ from, to, setQuery }) => {
  return (
    <KpiBaseComponentManage
      fieldsMapping={fieldsMapping}
      from={from}
      to={to}
      id={ID}
      loading={false} // TODO: remove unused props
      setQuery={setQuery}
    />
  );
};

export const NetworkKpiUniquePrivateIps = React.memo(NetworkKpiUniquePrivateIpsComponent);
