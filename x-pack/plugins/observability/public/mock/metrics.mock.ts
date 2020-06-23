/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MetricsFetchDataResponse } from '../typings/fetch_data_response';
import { FetchData } from '../data_handler';

export const fetchMetricsData: FetchData<MetricsFetchDataResponse> = () => {
  return Promise.resolve(response);
};

const response: MetricsFetchDataResponse = {
  title: i18n.translate('metrics.observabilityDashboard.title', {
    defaultMessage: 'Metrics',
  }),
  appLink: '/app/apm',
  stats: {
    hosts: { label: 'Hosts', value: 11 },
    cpu: { label: 'CPU usage', pct: 80 },
    memory: { label: 'Memory Usage', pct: 36.2 },
    disk: { label: 'Disk Usage', pct: 32.4 },
    inboundTraffic: { label: 'Inbount traffic', bytes: 1024 },
    outboundTraffic: { label: 'Outbount traffic', bytes: 1024 },
  },
  series: {
    outboundTraffic: {
      label: 'Outbount traffic',
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
    inboundTraffic: {
      label: 'Inbound traffic',
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
  },
};
