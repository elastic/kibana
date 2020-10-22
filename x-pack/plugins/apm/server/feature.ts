/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../licensing/common/types';
import { AlertType } from '../common/alert_types';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import {
  LicensingPluginSetup,
  LicensingRequestHandlerContext,
} from '../../licensing/server';

export const APM_FEATURE = {
  id: 'apm',
  name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
    defaultMessage: 'APM and User Experience',
  }),
  order: 900,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['apm', 'ux', 'kibana'],
  catalogue: ['apm'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: Object.values(AlertType),
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: ['apm', 'ux', 'kibana'],
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
      app: ['apm', 'ux', 'kibana'],
      api: ['apm'],
      catalogue: ['apm'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        read: Object.values(AlertType),
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:show', 'alerting:save'],
    },
  },
};

interface Feature {
  name: string;
  license: LicenseType;
}
type FeatureName = 'serviceMaps' | 'ml' | 'customLinks';
export const features: Record<FeatureName, Feature> = {
  serviceMaps: {
    name: 'APM service maps',
    license: 'platinum',
  },
  ml: {
    name: 'APM machine learning',
    license: 'platinum',
  },
  customLinks: {
    name: 'APM custom links',
    license: 'gold',
  },
};

export function registerFeaturesUsage({
  licensingPlugin,
}: {
  licensingPlugin: LicensingPluginSetup;
}) {
  Object.values(features).forEach(({ name, license }) => {
    licensingPlugin.featureUsage.register(name, license);
  });
}

export function notifyFeatureUsage({
  licensingPlugin,
  featureName,
}: {
  licensingPlugin: LicensingRequestHandlerContext;
  featureName: FeatureName;
}) {
  const feature = features[featureName];
  licensingPlugin.featureUsage.notifyUsage(feature.name);
}
