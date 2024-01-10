/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';

import type { StatItems } from '../../../../components/stat_items';
import type { NetworkKpiProps } from '../types';
import * as i18n from './translations';
import { kpiNetworkEventsLensAttributes } from '../../../../../common/components/visualization_actions/lens_attributes/network/kpi_network_events';
import { KpiBaseComponent } from '../../../../components/kpi';

export const ID = 'networkKpiNetworkEventsQuery';

const euiVisColorPalette = euiPaletteColorBlind();
const euiColorVis1 = euiVisColorPalette[1];

export const networkEventsStatsItems: Readonly<StatItems[]> = [
  {
    key: 'networkEvents',
    fields: [
      {
        key: 'networkEvents',
        color: euiColorVis1,
        lensAttributes: kpiNetworkEventsLensAttributes,
      },
    ],
    description: i18n.NETWORK_EVENTS,
  },
];

const NetworkKpiNetworkEventsComponent: React.FC<NetworkKpiProps> = ({ from, to }) => {
  return <KpiBaseComponent id={ID} statItems={networkEventsStatsItems} from={from} to={to} />;
};

export const NetworkKpiNetworkEvents = React.memo(NetworkKpiNetworkEventsComponent);
