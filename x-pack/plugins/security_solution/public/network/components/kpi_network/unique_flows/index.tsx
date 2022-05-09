/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { kpiUniqueFlowIdsLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_flow_ids';
import { useNetworkKpiUniqueFlows, ID } from '../../../containers/kpi_network/unique_flows';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'uniqueFlowId',
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
        lensAttributes: kpiUniqueFlowIdsLensAttributes,
      },
    ],
    description: i18n.UNIQUE_FLOW_IDS,
  },
];

const NetworkKpiUniqueFlowsComponent: React.FC<NetworkKpiProps> = ({
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
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiUniqueFlows({
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

export const NetworkKpiUniqueFlows = React.memo(NetworkKpiUniqueFlowsComponent);
