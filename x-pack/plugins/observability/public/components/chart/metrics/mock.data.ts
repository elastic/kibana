/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FetchDataResponse } from '../../../typings/data_handler';

export const data: FetchDataResponse = {
  title: i18n.translate('metrics.observabilityDashboard.title', {
    defaultMessage: 'Metrics',
  }),
  appLink: '/app/apm',
  stats: [
    { label: 'Hosts', value: 11 },
    { label: 'CPU usage', value: 80 },
    { label: 'Memory Usage', value: 36.2 },
    { label: 'Disk Usage', value: 32.4 },
  ],
  series: [
    {
      label: 'Outbount trafic',
      coordinates: [
        {
          x: 1589805437549,
          y: 331514,
        },
        {
          x: 1590047357549,
          y: 319208,
        },
        {
          x: 1590289277549,
          y: 309648,
        },
        {
          x: 1590531197549,
          y: 280568,
        },
        {
          x: 1590773117549,
          y: 337180,
        },
        {
          x: 1591015037549,
          y: 122468,
        },
        {
          x: 1591256957549,
          y: 184164,
        },
        {
          x: 1591498877549,
          y: 316323,
        },
        {
          x: 1591740797549,
          y: 307351,
        },
        {
          x: 1591982717549,
          y: 290262,
        },
      ],
    },
    {
      label: 'Inbound trafic',
      coordinates: [
        {
          x: 1589805437549,
          y: 331514,
        },
        {
          x: 1590047357549,
          y: 319208,
        },
        {
          x: 1590289277549,
          y: 309648,
        },
        {
          x: 1590531197549,
          y: 280568,
        },
        {
          x: 1590773117549,
          y: 337180,
        },
        {
          x: 1591015037549,
          y: 122468,
        },
        {
          x: 1591256957549,
          y: 184164,
        },
        {
          x: 1591498877549,
          y: 316323,
        },
        {
          x: 1591740797549,
          y: 307351,
        },
        {
          x: 1591982717549,
          y: 290262,
        },
      ],
    },
  ],
};
