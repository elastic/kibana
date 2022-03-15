/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { kpiUserAuthenticationsArea } from '../../../../common/components/visualization_actions/configs/hosts/kpi_user_authentications_area';
import { kpiUserAuthenticationsBar } from '../../../../common/components/visualization_actions/configs/hosts/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccess } from '../../../../common/components/visualization_actions/configs/hosts/kpi_user_authentications_metric_success';
import { kpiUserAuthenticationsMetricFailure } from '../../../../common/components/visualization_actions/configs/hosts/kpi_user_authentication_metric_failure';
import { useHostsKpiAuthentications, ID } from '../../../containers/kpi_hosts/authentications';
import { HostsKpiBaseComponentManage } from '../common';
import { HostsKpiProps, HostsKpiChartColors } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/components/query_toggle';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'authentication',
    fields: [
      {
        key: 'authenticationsSuccess',
        name: i18n.SUCCESS_CHART_LABEL,
        description: i18n.SUCCESS_UNIT_LABEL,
        value: null,
        color: HostsKpiChartColors.authenticationsSuccess,
        icon: 'check',
        lensAttributes: kpiUserAuthenticationsMetricSuccess,
      },
      {
        key: 'authenticationsFailure',
        name: i18n.FAIL_CHART_LABEL,
        description: i18n.FAIL_UNIT_LABEL,
        value: null,
        color: HostsKpiChartColors.authenticationsFailure,
        icon: 'cross',
        lensAttributes: kpiUserAuthenticationsMetricFailure,
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    description: i18n.USER_AUTHENTICATIONS,
    areaChartLensAttributes: kpiUserAuthenticationsArea,
    barChartLensAttributes: kpiUserAuthenticationsBar,
  },
];

const HostsKpiAuthenticationsComponent: React.FC<HostsKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  const [loading, { refetch, id, inspect, ...data }] = useHostsKpiAuthentications({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip: querySkip,
  });

  return (
    <HostsKpiBaseComponentManage
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
      setQuerySkip={setQuerySkip}
    />
  );
};

HostsKpiAuthenticationsComponent.displayName = 'HostsKpiAuthenticationsComponent';

export const HostsKpiAuthentications = React.memo(HostsKpiAuthenticationsComponent);
