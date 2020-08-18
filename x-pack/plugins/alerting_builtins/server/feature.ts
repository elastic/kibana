/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ID as IndexThreshold } from './alert_types/index_threshold/alert_type';
import { BUILT_IN_ALERTS_FEATURE_ID } from '../common';

export const BUILT_IN_ALERTS_FEATURE = {
  id: BUILT_IN_ALERTS_FEATURE_ID,
  name: i18n.translate('xpack.alertingBuiltins.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Built-In Alerts',
  }),
  icon: 'bell',
  app: [],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: [IndexThreshold],
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        all: [IndexThreshold],
        read: [],
      },
      savedObject: {
        all: [],
        read: [],
      },
      api: [],
      ui: [],
    },
    read: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        all: [],
        read: [IndexThreshold],
      },
      savedObject: {
        all: [],
        read: [],
      },
      api: [],
      ui: [],
    },
  },
};
