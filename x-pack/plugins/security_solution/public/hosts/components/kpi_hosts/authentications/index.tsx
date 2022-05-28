/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { kpiUserAuthenticationsAreaLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_user_authentications_area';
import { kpiUserAuthenticationsBarLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_user_authentications_bar';
import { kpiUserAuthenticationsMetricSuccessLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_user_authentications_metric_success';
import { kpiUserAuthenticationsMetricFailureLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_user_authentication_metric_failure';
import { useHostsKpiAuthentications, ID } from '../../../containers/kpi_hosts/authentications';
import { KpiBaseComponentManage } from '../common';
import { HostsKpiProps, HostsKpiChartColors } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

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
        lensAttributes: kpiUserAuthenticationsMetricSuccessLensAttributes,
      },
      {
        key: 'authenticationsFailure',
        name: i18n.FAIL_CHART_LABEL,
        description: i18n.FAIL_UNIT_LABEL,
        value: null,
        color: HostsKpiChartColors.authenticationsFailure,
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
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [loading, { refetch, id, inspect, ...data }] = useHostsKpiAuthentications({
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
      narrowDateRange={narrowDateRange}
      refetch={refetch}
      setQuery={setQuery}
      setQuerySkip={setQuerySkip}
    />
  );
};

HostsKpiAuthenticationsComponent.displayName = 'HostsKpiAuthenticationsComponent';

export const HostsKpiAuthentications = React.memo(HostsKpiAuthenticationsComponent);
