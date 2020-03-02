/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const METRICS_FEATURE = {
  id: 'infrastructure',
  name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
    defaultMessage: 'Metrics',
  }),
  order: 700,
  icon: 'metricsApp',
  navLinkId: 'metrics',
  app: ['infra', 'kibana'],
  catalogue: ['infraops'],
  privileges: {
    all: {
      app: ['infra', 'kibana'],
      catalogue: ['infraops'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: ['index-pattern'],
      },
      ui: ['show', 'configureSource', 'save'],
    },
    read: {
      app: ['infra', 'kibana'],
      catalogue: ['infraops'],
      api: ['infra'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source', 'index-pattern'],
      },
      ui: ['show'],
    },
  },
};

export const LOGS_FEATURE = {
  id: 'logs',
  name: i18n.translate('xpack.infra.featureRegistry.linkLogsTitle', {
    defaultMessage: 'Logs',
  }),
  order: 800,
  icon: 'logsApp',
  navLinkId: 'logs',
  app: ['infra', 'kibana'],
  catalogue: ['infralogging'],
  privileges: {
    all: {
      app: ['infra', 'kibana'],
      catalogue: ['infralogging'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: [],
      },
      ui: ['show', 'configureSource', 'save'],
    },
    read: {
      app: ['infra', 'kibana'],
      catalogue: ['infralogging'],
      api: ['infra'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source'],
      },
      ui: ['show'],
    },
  },
};
