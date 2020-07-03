/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const APM_FEATURE = {
  id: 'apm',
  name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
    defaultMessage: 'APM',
  }),
  order: 900,
  icon: 'apmApp',
  navLinkId: 'apm',
  app: ['apm', 'kibana'],
  catalogue: ['apm'],
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: ['apm', 'kibana'],
      api: ['apm', 'apm_write', 'alerting-read', 'alerting-all'],
      catalogue: ['apm'],
      savedObject: {
        all: ['alert'],
        read: [],
      },
      ui: ['show', 'save', 'alerting:show', 'alerting:save', 'alerting:delete'],
    },
    read: {
      app: ['apm', 'kibana'],
      api: ['apm', 'alerting-read', 'alerting-all'],
      catalogue: ['apm'],
      savedObject: {
        all: ['alert'],
        read: [],
      },
      ui: ['show', 'alerting:show', 'alerting:save', 'alerting:delete'],
    },
  },
};

export const APM_SERVICE_MAPS_FEATURE_NAME = 'APM service maps';
export const APM_SERVICE_MAPS_LICENSE_TYPE = 'platinum';
