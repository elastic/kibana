/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiUniqueIpsAreaLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_area';
import { kpiUniqueIpsBarLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_bar';
import { kpiUniqueIpsDestinationMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_destination_metric';
import { kpiUniqueIpsSourceMetricLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/hosts/kpi_unique_ips_source_metric';
import { useHostsKpiUniqueIps, ID } from '../../../containers/kpi_hosts/unique_ips';
import { KpiBaseComponentManage } from '../common';
import type { HostsKpiProps } from '../types';
import { HostsKpiChartColors } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'uniqueIps',
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        value: null,
        color: HostsKpiChartColors.uniqueSourceIps,
        icon: 'visMapCoordinate',
        lensAttributes: kpiUniqueIpsSourceMetricLensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        value: null,
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

const HostsKpiUniqueIpsComponent: React.FC<HostsKpiProps> = ({
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

  const [loading, { refetch, id, inspect, ...data }] = useHostsKpiUniqueIps({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip: querySkip || isChartEmbeddablesEnabled,
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

export const HostsKpiUniqueIps = React.memo(HostsKpiUniqueIpsComponent);
