/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';

import { StatItems } from '../../../../common/components/stat_items';
import { useNetworkKpiUniquePrivateIps } from '../../../containers/kpi_network/unique_private_ips';
import { NetworkKpiBaseComponentManage } from '../common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';

const euiVisColorPalette = euiPaletteColorBlind();
const euiColorVis2 = euiVisColorPalette[2];
const euiColorVis3 = euiVisColorPalette[3];

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
  },
];

const NetworkKpiUniquePrivateIpsComponent: React.FC<NetworkKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiUniquePrivateIps({
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

export const NetworkKpiUniquePrivateIps = React.memo(NetworkKpiUniquePrivateIpsComponent);
