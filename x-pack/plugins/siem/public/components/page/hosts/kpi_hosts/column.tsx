/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KpiValue, StatItems } from '../../../stat_items';
import * as i18n from './translations';
import { getEmptyTagValue } from '../../../empty_value';

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

export const fieldTitleMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
        color: euiColorVis1,
        icon: 'storage',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    enableAreaChart: true,
    grow: 2,
    description: i18n.HOSTS,
  },
  {
    key: 'authentication',
    fields: [
      {
        key: 'authSuccess',
        description: i18n.AUTHENTICATION_SUCCESS,
        color: euiColorVis0,
        icon: 'check',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
      {
        key: 'authFailure',
        description: i18n.AUTHENTICATION_FAILURE,
        color: euiColorVis9,
        icon: 'cross',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.AUTHENTICATION,
  },
  {
    key: 'uniqueIps',
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.UNIQUE_SOURCE_IPS_ABBREVIATION,
        description: i18n.UNIQUE_SOURCE_IPS,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
      {
        key: 'uniqueDestinationIps',
        description: i18n.UNIQUE_DESTINATION_IPS,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.UNIQUE_IPS,
  },
];
