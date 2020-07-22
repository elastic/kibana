/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../common/alerting/logs/types';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from './lib/alerting/inventory_metric_threshold/types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from './lib/alerting/metric_threshold/types';

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
  alerting: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
  privileges: {
    all: {
      app: ['infra', 'kibana'],
      catalogue: ['infraops'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: ['index-pattern'],
      },
      alerting: {
        all: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
      },
      ui: ['show', 'configureSource', 'save', 'alerting:show'],
    },
    read: {
      app: ['infra', 'kibana'],
      catalogue: ['infraops'],
      api: ['infra'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source', 'index-pattern'],
      },
      alerting: {
        all: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
      },
      ui: ['show', 'alerting:show'],
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
  alerting: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
  privileges: {
    all: {
      app: ['infra', 'kibana'],
      catalogue: ['infralogging'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: [],
      },
      alerting: {
        all: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
      },
      ui: ['show', 'configureSource', 'save'],
    },
    read: {
      app: ['infra', 'kibana'],
      catalogue: ['infralogging'],
      api: ['infra'],
      alerting: {
        all: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
      },
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source'],
      },
      ui: ['show'],
    },
  },
};
