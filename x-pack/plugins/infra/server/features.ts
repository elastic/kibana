/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '../common/alerting/logs/log_threshold/types';
import {
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../common/alerting/metrics';
import { LOGS_FEATURE_ID, METRICS_FEATURE_ID } from '../common/constants';

export const METRICS_FEATURE = {
  id: METRICS_FEATURE_ID,
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
        rule: {
          all: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
        },
        alert: {
          all: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
        },
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
        rule: {
          read: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
        },
        alert: {
          read: [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
};

export const LOGS_FEATURE = {
  id: LOGS_FEATURE_ID,
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
  alerting: [LOG_DOCUMENT_COUNT_RULE_TYPE_ID],
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
        rule: {
          all: [LOG_DOCUMENT_COUNT_RULE_TYPE_ID],
        },
        alert: {
          all: [LOG_DOCUMENT_COUNT_RULE_TYPE_ID],
        },
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
        rule: {
          read: [LOG_DOCUMENT_COUNT_RULE_TYPE_ID],
        },
        alert: {
          read: [LOG_DOCUMENT_COUNT_RULE_TYPE_ID],
        },
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
