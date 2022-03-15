/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { kpiDnsQueriesLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_dns_queries';
import { useNetworkKpiDns } from '../../../containers/kpi_network/dns';
import { NetworkKpiBaseComponentManage } from '../common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'dnsQueries',
    fields: [
      {
        key: 'dnsQueries',
        value: null,
        lensAttributes: kpiDnsQueriesLensAttributes,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
];

const NetworkKpiDnsComponent: React.FC<NetworkKpiProps> = ({
  filterQuery,
  from,
  indexNames,
  to,
  narrowDateRange,
  setQuery,
  skip,
}) => {
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiDns({
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

export const NetworkKpiDns = React.memo(NetworkKpiDnsComponent);
