/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../common/components/stat_items';
import { kpiTlsHandshakesLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_tls_handshakes';
import { ID } from '../../../containers/kpi_network/tls_handshakes';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common/kpi_embeddable_component';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';

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

const NetworkKpiTlsHandshakesComponent: React.FC<NetworkKpiProps> = ({ from, to, setQuery }) => {
  return (
    <KpiBaseComponentManage
      fieldsMapping={fieldsMapping}
      from={from}
      id={ID}
      loading={false} // TODO: remove unused props
      setQuery={setQuery}
      to={to}
    />
  );
};

export const NetworkKpiTlsHandshakes = React.memo(NetworkKpiTlsHandshakesComponent);
