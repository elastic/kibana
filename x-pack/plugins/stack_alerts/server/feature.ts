/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '../../../plugins/features/common';
import { ID as IndexThreshold } from './alert_types/index_threshold/alert_type';
import { GEO_CONTAINMENT_ID as GeoContainment } from './alert_types/geo_containment/alert_type';
import { ES_QUERY_ID as ElasticsearchQuery } from './alert_types/es_query/alert_type';
import { STACK_ALERTS_FEATURE_ID } from '../common';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';

export const BUILT_IN_ALERTS_FEATURE: KibanaFeatureConfig = {
  id: STACK_ALERTS_FEATURE_ID,
  name: i18n.translate('xpack.stackAlerts.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Stack Rules',
  }),
  app: [],
  category: DEFAULT_APP_CATEGORIES.management,
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: [IndexThreshold, GeoContainment, ElasticsearchQuery],
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
<<<<<<< HEAD
        rule: {
          all: [IndexThreshold, GeoContainment, ElasticsearchQuery],
        },
        alert: {
          read: [IndexThreshold, GeoContainment, ElasticsearchQuery],
=======
        all: {
          rule: [IndexThreshold, GeoContainment, ElasticsearchQuery],
          alert: [],
        },
        read: {
          rule: [],
          alert: [IndexThreshold, GeoContainment, ElasticsearchQuery],
>>>>>>> Initial commit with changes needed for subfeature privilege
        },
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
<<<<<<< HEAD
        rule: {
          read: [IndexThreshold, GeoContainment, ElasticsearchQuery],
        },
        alert: {
          read: [IndexThreshold, GeoContainment, ElasticsearchQuery],
=======
        all: {
          rule: [],
          alert: [],
        },
        read: {
          rule: [IndexThreshold, GeoContainment, ElasticsearchQuery],
          alert: [IndexThreshold, GeoContainment, ElasticsearchQuery],
>>>>>>> Initial commit with changes needed for subfeature privilege
        },
      },
      savedObject: {
        all: [],
        read: [],
      },
      api: [],
      ui: [],
    },
  },
  subFeatures: [
    {
      name: 'Manage Alerts',
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'alert_manage',
              name: 'Manage Alerts',
              includeIn: 'all',
              alerting: {
<<<<<<< HEAD
                alert: {
                  all: [IndexThreshold, GeoContainment, ElasticsearchQuery],
=======
                all: {
                  rule: [],
                  alert: [IndexThreshold, GeoContainment, ElasticsearchQuery],
                },
                read: {
                  rule: [],
                  alert: [],
>>>>>>> Initial commit with changes needed for subfeature privilege
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
