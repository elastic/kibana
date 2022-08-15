/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import React from 'react';
import type { StatItems } from '../../../../common/components/stat_items';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common/kpi_embeddable_component';
import { kpiTotalUsersMetricLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_metric';
import { kpiTotalUsersAreaLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_area';
import * as i18n from './translations';
import type { UsersKpiProps } from '../types';

const euiVisColorPalette = euiPaletteColorBlind();
const euiColorVis1 = euiVisColorPalette[1];

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'users',
    fields: [
      {
        key: 'users',
        value: null,
        color: euiColorVis1,
        icon: 'storage',
        lensAttributes: kpiTotalUsersMetricLensAttributes,
      },
    ],
    enableAreaChart: true,
    description: i18n.USERS,
    areaChartLensAttributes: kpiTotalUsersAreaLensAttributes,
  },
];

const QUERY_ID = 'TotalUsersKpiQuery';

const TotalUsersKpiComponent: React.FC<UsersKpiProps> = ({ from, to, setQuery }) => {
  return (
    <KpiBaseComponentManage
      fieldsMapping={fieldsMapping}
      from={from}
      id={QUERY_ID}
      to={to}
      loading={false}
      setQuery={setQuery}
    />
  );
};

export const TotalUsersKpi = React.memo(TotalUsersKpiComponent);
