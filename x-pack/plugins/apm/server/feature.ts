/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType } from '../common/alert_types';

export const APM_FEATURE = {
  id: 'apm',
  name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
    defaultMessage: 'APM',
  }),
  order: 900,
  icon: 'apmApp',
  navLinkId: 'apm',
  app: ['apm', 'csm', 'kibana'],
  catalogue: ['apm'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: Object.values(AlertType),
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: ['apm', 'csm', 'kibana'],
      api: ['apm', 'apm_write'],
      catalogue: ['apm'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        all: Object.values(AlertType),
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'save', 'alerting:show', 'alerting:save'],
    },
    read: {
      app: ['apm', 'csm', 'kibana'],
      api: ['apm'],
      catalogue: ['apm'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        all: Object.values(AlertType),
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:show', 'alerting:save'],
    },
  },
};

export const APM_SERVICE_MAPS_FEATURE_NAME = 'APM service maps';
export const APM_SERVICE_MAPS_LICENSE_TYPE = 'platinum';
