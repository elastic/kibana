/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../components/stat_items';
import { kpiDnsQueriesLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_dns_queries';
import { KpiBaseComponent } from '../../../../components/kpi';

import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';

export const ID = 'networkKpiDnsQuery';

export const dnsStatItems: Readonly<StatItems[]> = [
  {
    key: 'dnsQueries',
    fields: [
      {
        key: 'dnsQueries',
        lensAttributes: kpiDnsQueriesLensAttributes,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
];

const NetworkKpiDnsComponent: React.FC<NetworkKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent id={ID} statItems={dnsStatItems} from={from} to={to} />;
};

export const NetworkKpiDns = React.memo(NetworkKpiDnsComponent);
