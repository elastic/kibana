/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LogsFetchDataResponse, FetchData } from '../typings';

export const fetchLogsData: FetchData<LogsFetchDataResponse> = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(response);
    }, 1000);
  });
};

const response: LogsFetchDataResponse = {
  title: i18n.translate('xpack.logs.observabilityDashboard.title', {
    defaultMessage: 'Logs',
  }),
  appLink: '/app/logs',
  stats: {
    unknown: { label: 'Unknown', value: 73777, type: 'number' },
    'kibana.log': { label: 'Kibana.log', value: 1018, type: 'number' },
    'nginx.access': { label: 'Nginx.access', value: 5528, type: 'number' },
  },
  series: {
    unknown: {
      label: 'Unknwon',
      coordinates: [
        {
          x: 1588942800000,
          y: 50,
        },
        {
          x: 1589078700000,
          y: 100,
        },
        {
          x: 1589214600000,
          y: 5000,
        },
        {
          x: 1589350500000,
          y: 6000,
        },
        {
          x: 1589486400000,
          y: 4000,
        },
        {
          x: 1589622300000,
          y: 5000,
        },
        {
          x: 1589758200000,
          y: 10000,
        },
        {
          x: 1589894100000,
          y: 1500,
        },
        {
          x: 1590030000000,
          y: 3000,
        },
      ],
    },
    'kibana.log': {
      label: 'Kibana.log',
      coordinates: [
        {
          x: 1588942800000,
          y: 50,
        },
        {
          x: 1589078700000,
          y: 100,
        },
        {
          x: 1589214600000,
          y: 5000,
        },
        {
          x: 1589350500000,
          y: 6000,
        },
        {
          x: 1589486400000,
          y: 4000,
        },
        {
          x: 1589622300000,
          y: 5000,
        },
        {
          x: 1589758200000,
          y: 10000,
        },
        {
          x: 1589894100000,
          y: 1500,
        },
        {
          x: 1590030000000,
          y: 3000,
        },
      ],
    },
    'nginx.access': {
      label: 'Nginx.access',
      coordinates: [
        {
          x: 1588942800000,
          y: 594.3174603174604,
        },
        {
          x: 1589078700000,
          y: 637.9072847682119,
        },
        {
          x: 1589214600000,
          y: 798.9867549668874,
        },
        {
          x: 1589350500000,
          y: 823.3973509933775,
        },
        {
          x: 1589486400000,
          y: 883.3112582781457,
        },
        {
          x: 1589622300000,
          y: 840.6423841059602,
        },
        {
          x: 1589758200000,
          y: 863.8079470198676,
        },
        {
          x: 1589894100000,
          y: 86.54966887417218,
        },
        {
          x: 1590030000000,
          y: 0,
        },
      ],
    },
  },
};
