/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { UsersQueries } from '../../../../../common/search_strategy/security_solution/users';
import { UpdateDateRange } from '../../../../common/components/charts/common';

import { StatItems } from '../../../../common/components/stat_items';
import { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { kpiTotalUsersMetricLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_metric';
import { kpiTotalUsersAreaLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_area';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

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

export interface UsersKpiProps {
  filterQuery?: string;
  from: string;
  to: string;
  indexNames: string[];
  narrowDateRange: UpdateDateRange;
  setQuery: GlobalTimeArgs['setQuery'];
  skip: boolean;
}

const QUERY_ID = 'TotalUsersKpiQuery';

const TotalUsersKpiComponent: React.FC<UsersKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const { toggleStatus } = useQueryToggle(QUERY_ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const { loading, result, search, refetch, inspect } =
    useSearchStrategy<UsersQueries.kpiTotalUsers>({
      factoryQueryType: UsersQueries.kpiTotalUsers,
      initialResult: { users: 0, usersHistogram: [] },
      errorMessage: i18n.ERROR_USERS_KPI,
      abort: querySkip,
    });

  useEffect(() => {
    if (!querySkip) {
      search({
        filterQuery,
        defaultIndex: indexNames,
        timerange: {
          interval: '12h',
          from,
          to,
        },
      });
    }
  }, [search, from, to, filterQuery, indexNames, querySkip]);

  return (
    <KpiBaseComponentManage
      data={result}
      id={QUERY_ID}
      inspect={inspect}
      loading={loading}
      fieldsMapping={fieldsMapping}
      from={from}
      to={to}
      narrowDateRange={narrowDateRange}
      refetch={refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
    />
  );
};

export const TotalUsersKpi = React.memo(TotalUsersKpiComponent);
