/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_HISTORY = 'alert-history';

export const AlertHistoryEsIndexConnectorId = 'preconfigured-alert-history-es-index';
export const AlertHistoryEsIndexConnectorIndexName = `${ALERT_HISTORY}-index`;
export const AlertHistoryIlmPolicyName = `${ALERT_HISTORY}-policy`;

export const AlertHistoryIlmPolicy = {
  policy: {
    phases: {
      hot: {
        actions: {
          rollover: {
            max_size: '50GB',
            max_age: '30d',
          },
        },
      },
      delete: {
        min_age: '90d',
        actions: {
          delete: {},
        },
      },
    },
  },
};

export const getIndexName = (kibanaVersion: string) => `${ALERT_HISTORY}-${kibanaVersion}`;

export const getInitialIndexName = (kibanaVersion: string) =>
  `${getIndexName(kibanaVersion)}-000001`;
