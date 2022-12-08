/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiUniqueFlowIdsLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_flow_ids';
import { useNetworkKpiUniqueFlows, ID } from '../../../containers/kpi_network/unique_flows';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

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

  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiUniqueFlows({
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

export const NetworkKpiUniqueFlows = React.memo(NetworkKpiUniqueFlowsComponent);
