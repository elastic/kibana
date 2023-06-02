/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type { StatItems } from '../../../../components/stat_items';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { kpiTotalUsersMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_metric';
import { kpiTotalUsersAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_total_users_area';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import type { UsersKpiProps } from '../types';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';
import { InputsModelId } from '../../../../../common/store/inputs/constants';

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

const TotalUsersKpiComponent: React.FC<UsersKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  updateDateRange,
  setQuery,
  skip,
}) => {
  const { toggleStatus } = useQueryToggle(QUERY_ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const { loading, result, search, refetch, inspect } =
    useSearchStrategy<UsersQueries.kpiTotalUsers>({
      factoryQueryType: UsersQueries.kpiTotalUsers,
      initialResult: { users: 0, usersHistogram: [] },
      errorMessage: i18n.ERROR_USERS_KPI,
      abort: querySkip || isChartEmbeddablesEnabled,
    });

  const { session, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId: InputsModelId.global,
    queryId: QUERY_ID,
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
      updateDateRange={updateDateRange}
      refetch={isChartEmbeddablesEnabled ? refetchByRestartingSession : refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
      session={isChartEmbeddablesEnabled ? session : undefined}
    />
  );
};

export const TotalUsersKpi = React.memo(TotalUsersKpiComponent);
