/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LOG_DOCUMENT_COUNT_ALERT_TYPE_ID } from '../common/alerting/logs/log_threshold/types';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from './lib/alerting/inventory_metric_threshold/types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from './lib/alerting/metric_threshold/types';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';

export const METRICS_FEATURE = {
  id: 'infrastructure',
  name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
    defaultMessage: 'Metrics',
  }),
  order: 800,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['infra', 'metrics', 'kibana'],
  catalogue: ['infraops', 'metrics'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
  privileges: {
    all: {
      app: ['infra', 'metrics', 'kibana'],
      catalogue: ['infraops', 'metrics'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: ['index-pattern'],
      },
      alerting: {
        all: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'configureSource', 'save'],
    },
    read: {
      app: ['infra', 'metrics', 'kibana'],
      catalogue: ['infraops', 'metrics'],
      api: ['infra'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source', 'index-pattern'],
      },
      alerting: {
        read: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
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
  order: 700,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['infra', 'logs', 'kibana'],
  catalogue: ['infralogging', 'logs'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
  privileges: {
    all: {
      app: ['infra', 'logs', 'kibana'],
      catalogue: ['infralogging', 'logs'],
      api: ['infra'],
      savedObject: {
        all: ['infrastructure-ui-source'],
        read: [],
      },
      alerting: {
        all: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'configureSource', 'save'],
    },
    read: {
      app: ['infra', 'logs', 'kibana'],
      catalogue: ['infralogging', 'logs'],
      api: ['infra'],
      alerting: {
        read: [LOG_DOCUMENT_COUNT_ALERT_TYPE_ID],
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source'],
      },
      ui: ['show'],
    },
  },
};
