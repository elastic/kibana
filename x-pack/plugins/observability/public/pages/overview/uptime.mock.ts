/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FetchDataResponse } from '../../typings/data_handler';

export const uptimeData: FetchDataResponse = {
  title: 'Uptiome',
  appLink: '/app/uptime',
  stats: [
    {
      label: 'Down',
      value: 115,
    },
    {
      label: 'Up',
      value: 582,
    },
  ],
  series: [
    {
      label: 'Down',
      color: 'euiColorVis2',
      coordinates: [
        {
          x: 1591439940000,
          y: 2,
        },
        {
          x: 1591440000000,
          y: 6,
        },
        {
          x: 1591440060000,
          y: 6,
        },
        {
          x: 1591440120000,
          y: 6,
        },
        {
          x: 1591440180000,
          y: 15,
        },
        {
          x: 1591440240000,
          y: 6,
        },
        {
          x: 1591440300000,
          y: 6,
        },
        {
          x: 1591440360000,
          y: 6,
        },
        {
          x: 1591440420000,
          y: 6,
        },
        {
          x: 1591440480000,
          y: 15,
        },
        {
          x: 1591440540000,
          y: 6,
        },
        {
          x: 1591440600000,
          y: 6,
        },
        {
          x: 1591440660000,
          y: 6,
        },
        {
          x: 1591440720000,
          y: 6,
        },
        {
          x: 1591440780000,
          y: 15,
        },
        {
          x: 1591440840000,
          y: 2,
        },
      ],
    },
    {
      label: 'Up',
      color: 'euiColorLightShade',
      coordinates: [
        {
          x: 1591439940000,
          y: 12,
        },
        {
          x: 1591440000000,
          y: 30,
        },
        {
          x: 1591440060000,
          y: 30,
        },
        {
          x: 1591440120000,
          y: 30,
        },
        {
          x: 1591440180000,
          y: 75,
        },
        {
          x: 1591440240000,
          y: 30,
        },
        {
          x: 1591440300000,
          y: 30,
        },
        {
          x: 1591440360000,
          y: 30,
        },
        {
          x: 1591440420000,
          y: 30,
        },
        {
          x: 1591440480000,
          y: 75,
        },
        {
          x: 1591440540000,
          y: 30,
        },
        {
          x: 1591440600000,
          y: 30,
        },
        {
          x: 1591440660000,
          y: 30,
        },
        {
          x: 1591440720000,
          y: 30,
        },
        {
          x: 1591440780000,
          y: 75,
        },
        {
          x: 1591440840000,
          y: 15,
        },
      ],
    },
  ],
};
