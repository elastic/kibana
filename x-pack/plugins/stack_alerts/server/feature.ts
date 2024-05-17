/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { TRANSFORM_RULE_TYPE } from '@kbn/transform-plugin/common';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { ES_QUERY_ID as ElasticsearchQuery } from '@kbn/rule-data-utils';
import { ID as IndexThreshold } from './rule_types/index_threshold/rule_type';
import { GEO_CONTAINMENT_ID as GeoContainment } from './rule_types/geo_containment';

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
  alerting: {
    ruleTypeIds: [IndexThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
    consumers: [STACK_ALERTS_FEATURE_ID],
  },
  privileges: {
    all: {
      app: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: {
        rule: {
          all: {
            ruleTypeIds: [IndexThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
            consumers: [STACK_ALERTS_FEATURE_ID],
          },
        },
        alert: {
          all: {
            ruleTypeIds: [IndexThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
            consumers: [STACK_ALERTS_FEATURE_ID],
          },
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
          read: {
            ruleTypeIds: [IndexThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
            consumers: [STACK_ALERTS_FEATURE_ID],
          },
        },
        alert: {
          read: {
            ruleTypeIds: [IndexThreshold, GeoContainment, ElasticsearchQuery, TransformHealth],
            consumers: [STACK_ALERTS_FEATURE_ID],
          },
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
