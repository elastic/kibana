/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { logViewSavedObjectName } from '@kbn/logs-shared-plugin/server';
import {
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { metricsDataSourceSavedObjectName } from '@kbn/metrics-data-access-plugin/server';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '../common/alerting/logs/log_threshold/types';
import {
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../common/alerting/metrics';
import { LOGS_FEATURE_ID, METRICS_FEATURE_ID } from '../common/constants';
import { infraSourceConfigurationSavedObjectName } from './lib/sources/saved_object_type';

const metricRuleTypes = [
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

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
  alerting: metricRuleTypes,
  privileges: {
    all: {
      app: ['infra', 'metrics', 'kibana'],
      catalogue: ['infraops', 'metrics'],
      api: ['infra', 'rac'],
      savedObject: {
        all: ['infrastructure-ui-source', metricsDataSourceSavedObjectName],
        read: ['index-pattern'],
      },
      alerting: {
        rule: {
          all: metricRuleTypes,
        },
        alert: {
          all: metricRuleTypes,
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
      api: ['infra', 'rac'],
      savedObject: {
        all: [],
        read: ['infrastructure-ui-source', 'index-pattern', metricsDataSourceSavedObjectName],
      },
      alerting: {
        rule: {
          read: metricRuleTypes,
        },
        alert: {
          read: metricRuleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
};

const logsRuleTypes = [
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

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
  alerting: logsRuleTypes,
  privileges: {
    all: {
      app: ['infra', 'logs', 'kibana'],
      catalogue: ['infralogging', 'logs'],
      api: ['infra', 'rac'],
      savedObject: {
        all: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        read: [],
      },
      alerting: {
        rule: {
          all: logsRuleTypes,
        },
        alert: {
          all: logsRuleTypes,
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
      api: ['infra', 'rac'],
      alerting: {
        rule: {
          read: logsRuleTypes,
        },
        alert: {
          read: logsRuleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      savedObject: {
        all: [],
        read: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
      },
      ui: ['show'],
    },
  },
};
