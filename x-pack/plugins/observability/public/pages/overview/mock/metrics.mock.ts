/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsFetchDataResponse, FetchData } from '../../../typings';

export const fetchMetricsData: FetchData<MetricsFetchDataResponse> = () => {
  return Promise.resolve(response);
};

const response: MetricsFetchDataResponse = {
  title: 'Metrics',
  appLink: '/app/apm',
  stats: {
    hosts: { value: 11, type: 'number' },
    cpu: { value: 0.8, type: 'percent' },
    memory: { value: 0.362, type: 'percent' },
    inboundTraffic: { value: 1024, type: 'bytesPerSecond' },
    outboundTraffic: { value: 1024, type: 'bytesPerSecond' },
  },
  series: {
    outboundTraffic: {
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

export const emptyResponse: MetricsFetchDataResponse = {
  title: 'Metrics',
  appLink: '/app/apm',
  stats: {
    hosts: { value: 0, type: 'number' },
    cpu: { value: 0, type: 'percent' },
    memory: { value: 0, type: 'percent' },
    inboundTraffic: { value: 0, type: 'bytesPerSecond' },
    outboundTraffic: { value: 0, type: 'bytesPerSecond' },
  },
  series: {
    outboundTraffic: {
      coordinates: [],
    },
    inboundTraffic: {
      coordinates: [],
    },
  },
};
