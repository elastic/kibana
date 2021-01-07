/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';

import { StatItems } from '../../../../common/components/stat_items';
import { useNetworkKpiNetworkEvents } from '../../../containers/kpi_network/network_events';
import { NetworkKpiBaseComponentManage } from '../common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';

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
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiNetworkEvents({
    filterQuery,
    endDate: to,
    indexNames,
    startDate: from,
    skip,
  });

  return (
    <NetworkKpiBaseComponentManage
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

export const NetworkKpiNetworkEvents = React.memo(NetworkKpiNetworkEventsComponent);
