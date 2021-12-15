/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '../../../plugins/features/common';
import { ID as IndexThreshold } from './alert_types/index_threshold/alert_type';
import { ID as SearchThreshold } from './alert_types/search_threshold/rule_type';
import { GEO_CONTAINMENT_ID as GeoContainment } from './alert_types/geo_containment/alert_type';
import { ES_QUERY_ID as ElasticsearchQuery } from './alert_types/es_query/alert_type';
import { STACK_ALERTS_FEATURE_ID } from '../common';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { TRANSFORM_RULE_TYPE } from '../../transform/common';

const TransformHealth = TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH;

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
  alerting: [IndexThreshold, SearchThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        rule: {
          all: [
            IndexThreshold,
            SearchThreshold,
            GeoContainment,
            ElasticsearchQuery,
            TransformHealth,
          ],
        },
        alert: {
          all: [
            IndexThreshold,
            SearchThreshold,
            GeoContainment,
            ElasticsearchQuery,
            TransformHealth,
          ],
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
        rule: {
          read: [
            IndexThreshold,
            SearchThreshold,
            GeoContainment,
            ElasticsearchQuery,
            TransformHealth,
          ],
        },
        alert: {
          read: [
            IndexThreshold,
            SearchThreshold,
            GeoContainment,
            ElasticsearchQuery,
            TransformHealth,
          ],
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
};
