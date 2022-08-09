/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../common/components/stat_items';
import { kpiDnsQueriesLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_dns_queries';
import { ID } from '../../../containers/kpi_network/dns';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common/kpi_embeddable_component';

import type { NetworkKpiProps } from '../types';
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

const NetworkKpiDnsComponent: React.FC<NetworkKpiProps> = ({ from, to, setQuery }) => {
  return (
    <KpiBaseComponentManage
      fieldsMapping={fieldsMapping}
      from={from}
      id={ID}
      loading={false}
      setQuery={setQuery}
      to={to}
    />
  );
};

export const NetworkKpiDns = React.memo(NetworkKpiDnsComponent);
