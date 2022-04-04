/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { StatItems } from '../../../../common/components/stat_items';
import { kpiTlsHandshakesLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_tls_handshakes';
import { useNetworkKpiTlsHandshakes, ID } from '../../../containers/kpi_network/tls_handshakes';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';
import { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

export const fieldsMapping: Readonly<StatItems[]> = [
  {
    key: 'tlsHandshakes',
    fields: [
      {
        key: 'tlsHandshakes',
        value: null,
        lensAttributes: kpiTlsHandshakesLensAttributes,
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];

const NetworkKpiTlsHandshakesComponent: React.FC<NetworkKpiProps> = ({
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
  const [loading, { refetch, id, inspect, ...data }] = useNetworkKpiTlsHandshakes({
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

export const NetworkKpiTlsHandshakes = React.memo(NetworkKpiTlsHandshakesComponent);
