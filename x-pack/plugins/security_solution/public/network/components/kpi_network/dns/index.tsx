/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { useNetworkKpiDns } from '../../../containers/kpi_network/dns';
import { KpiNetworkBaseComponentManage } from '../common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'dnsQueries',
    fields: [
      {
        key: 'dnsQueries',
        value: null,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
];

const NetworkKpiDnsComponent: React.FC<NetworkKpiProps> = ({
  filterQuery,
  from,
  indexesName,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiDns({
    filterQuery,
    endDate: to,
    indexesName,
    startDate: from,
    skip,
  });

  return (
    <KpiNetworkBaseComponentManage
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

export const NetworkKpiDns = React.memo(NetworkKpiDnsComponent);
