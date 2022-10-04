/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StatItems } from '../../../../common/components/stat_items';
import { kpiUniqueFlowIdsLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_flow_ids';
import { ID } from '../../../containers/kpi_network/unique_flows';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common/kpi_embeddable_component';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';

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

const NetworkKpiUniqueFlowsComponent: React.FC<NetworkKpiProps> = ({ from, to, setQuery }) => {
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

export const NetworkKpiUniqueFlows = React.memo(NetworkKpiUniqueFlowsComponent);
