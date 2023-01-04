/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiUserAuthenticationsAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_area';
import { kpiUserAuthenticationsBarLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccessLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentications_metric_success';
import { kpiUserAuthenticationsMetricFailureLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/users/kpi_user_authentication_metric_failure';
import { useUsersKpiAuthentications, ID } from '../../../containers/users/authentications';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import type { UsersKpiProps } from '../types';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

enum ChartColors {
  authenticationsSuccess = '#54B399',
  authenticationsFailure = '#E7664C',
}

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'authentication',
    fields: [
      {
        key: 'authenticationsSuccess',
        name: i18n.SUCCESS_CHART_LABEL,
        description: i18n.SUCCESS_UNIT_LABEL,
        value: null,
        color: ChartColors.authenticationsSuccess,
        icon: 'check',
        lensAttributes: kpiUserAuthenticationsMetricSuccessLensAttributes,
      },
      {
        key: 'authenticationsFailure',
        name: i18n.FAIL_CHART_LABEL,
        description: i18n.FAIL_UNIT_LABEL,
        value: null,
        color: ChartColors.authenticationsFailure,
        icon: 'cross',
        lensAttributes: kpiUserAuthenticationsMetricFailureLensAttributes,
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    description: i18n.USER_AUTHENTICATIONS,
    areaChartLensAttributes: kpiUserAuthenticationsAreaLensAttributes,
    barChartLensAttributes: kpiUserAuthenticationsBarLensAttributes,
  },
];

const UsersKpiAuthenticationsComponent: React.FC<UsersKpiProps> = ({
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
  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const [loading, { refetch, id, inspect, ...data }] = useUsersKpiAuthentications({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip: querySkip,
  });

  const { searchSessionId, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId: InputsModelId.global,
    queryId: id,
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
      refetch={isChartEmbeddablesEnabled ? refetchByRestartingSession : refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
      searchSessionId={isChartEmbeddablesEnabled ? searchSessionId : undefined}
    />
  );
};

UsersKpiAuthenticationsComponent.displayName = 'UsersKpiAuthenticationsComponent';

export const UsersKpiAuthentications = React.memo(UsersKpiAuthenticationsComponent);
