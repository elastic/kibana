/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';

import type { StatItems } from '../../../../components/stat_items';
import { ID, useNetworkKpiNetworkEvents } from '../../../containers/kpi_network/network_events';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { kpiNetworkEventsLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_network_events';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

const euiVisColorPalette = euiPaletteColorBlind();
const euiColorVis1 = euiVisColorPalette[1];

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'networkEvents',
    fields: [
      {
        key: 'networkEvents',
        value: null,
        color: euiColorVis1,
        lensAttributes: kpiNetworkEventsLensAttributes,
      },
    ],
    description: i18n.NETWORK_EVENTS,
  },
];

const NetworkKpiNetworkEventsComponent: React.FC<NetworkKpiProps> = ({
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

  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiNetworkEvents({
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

export const NetworkKpiNetworkEvents = React.memo(NetworkKpiNetworkEventsComponent);
