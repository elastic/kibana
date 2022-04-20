/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  LicensingPluginSetup,
  LicensingApiRequestHandlerContext,
} from '@kbn/licensing-plugin/server';
import { AlertType, APM_SERVER_FEATURE_ID } from '../common/alert_types';

export const APM_FEATURE = {
  id: APM_SERVER_FEATURE_ID,
  name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
    defaultMessage: 'APM and User Experience',
  }),
  order: 900,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: [APM_SERVER_FEATURE_ID, 'ux', 'kibana'],
  catalogue: [APM_SERVER_FEATURE_ID],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: Object.values(AlertType),
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: [APM_SERVER_FEATURE_ID, 'ux', 'kibana'],
      api: [APM_SERVER_FEATURE_ID, 'apm_write', 'rac'],
      catalogue: [APM_SERVER_FEATURE_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        alert: {
          all: Object.values(AlertType),
        },
        rule: {
          all: Object.values(AlertType),
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'save', 'alerting:show', 'alerting:save'],
    },
    read: {
      app: [APM_SERVER_FEATURE_ID, 'ux', 'kibana'],
      api: [APM_SERVER_FEATURE_ID, 'rac'],
      catalogue: [APM_SERVER_FEATURE_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        alert: {
          read: Object.values(AlertType),
        },
        rule: {
          read: Object.values(AlertType),
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:show'],
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
  licensingPlugin: LicensingApiRequestHandlerContext;
  featureName: FeatureName;
}) {
  const feature = features[featureName];
  licensingPlugin.featureUsage.notifyUsage(feature.name);
}
