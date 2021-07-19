/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SubFeaturePrivilegeGroupType } from '../../features/common';
import { LicenseType } from '../../licensing/common/types';
import { AlertType, APM_SERVER_FEATURE_ID } from '../common/alert_types';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import {
  LicensingPluginSetup,
  LicensingApiRequestHandlerContext,
} from '../../licensing/server';

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
        rule: {
          read: Object.values(AlertType),
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:show', 'alerting:save'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.apm.featureRegistry.manageAlertsName', {
        defaultMessage: 'Alerts',
      }),
      privilegeGroups: [
        {
          groupType: 'mutually_exclusive' as SubFeaturePrivilegeGroupType,
          privileges: [
            {
              id: 'alerts_all',
              name: i18n.translate(
                'xpack.apm.featureRegistry.subfeature.alertsAllName',
                {
                  defaultMessage: 'All',
                }
              ),
              includeIn: 'all' as 'all',
              alerting: {
                alert: {
                  all: Object.values(AlertType),
                },
              },
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
            {
              id: 'alerts_read',
              name: i18n.translate(
                'xpack.apm.featureRegistry.subfeature.alertsReadName',
                {
                  defaultMessage: 'Read',
                }
              ),
              includeIn: 'read' as 'read',
              alerting: {
                alert: {
                  read: Object.values(AlertType),
                },
              },
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          ],
        },
      ],
    },
  ],
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
