/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import React from 'react';
import { UpdateDateRange } from '../../../../common/components/charts/common';

import { StatItems } from '../../../../common/components/stat_items';
import { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { useTotalUsersKpi } from '../../../containers/kpis/total_users';
import * as i18n from './translations';

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
      },
    ],
    enableAreaChart: true,
    description: i18n.USERS,
  },
];

export interface UsersKpiProps {
  filterQuery?: string;
  from: string;
  to: string;
  indexNames: string[];
  narrowDateRange: UpdateDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  skip: boolean;
}

const UsersKpiHostsComponent: React.FC<UsersKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const [loading, { refetch, id, inspect, ...data }] = useTotalUsersKpi({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip,
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
      narrowDateRange={narrowDateRange}
      refetch={refetch}
      setQuery={setQuery}
    />
  );
};

export const UsersKpiHosts = React.memo(UsersKpiHostsComponent);
