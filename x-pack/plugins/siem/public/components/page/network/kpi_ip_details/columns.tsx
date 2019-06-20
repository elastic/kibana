/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as i18n from './translations';
import { PreferenceFormattedBytes } from '../../../formatted_bytes';
import { getEmptyTagValue } from '../../../empty_value';
import { StatItems, KpiValue } from '../../../stat_items';

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

export const fieldTitleChartMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'packets',
    fields: [
      {
        key: 'sourcePackets',
        name: i18n.OUT,
        description: i18n.OUT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
      {
        key: 'destinationPackets',
        name: i18n.IN,
        description: i18n.IN,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.PACKETS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
  },
  {
    key: 'bytes',
    fields: [
      {
        key: 'sourceByte',
        name: i18n.OUT,
        description: i18n.OUT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: bytes => {
          if (bytes != null) {
            return <PreferenceFormattedBytes value={bytes} />;
          } else {
            return getEmptyTagValue();
          }
        },
      },
      {
        key: 'destinationByte',
        name: i18n.IN,
        description: i18n.IN,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: bytes => {
          if (bytes != null) {
            return <PreferenceFormattedBytes value={bytes} />;
          } else {
            return getEmptyTagValue();
          }
        },
      },
    ],
    description: i18n.BYTES,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
  },
];

export const fieldTitleMatrixMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'connections',
    fields: [
      {
        key: 'connections',
        color: euiColorVis1,
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.CONNECTIONS,
    grow: 1,
  },
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.HOSTS,
    grow: 1,
  },
];
