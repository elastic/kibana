/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  KibanaFeatureConfig,
  KibanaFeatureScope,
  ElasticsearchFeatureConfig,
} from '@kbn/features-plugin/common';
import { PLUGIN_FEATURE_ID, PLUGIN_ID, PLUGIN_NAME } from '../common';

export const KIBANA_FEATURE: KibanaFeatureConfig = {
  id: PLUGIN_FEATURE_ID,
  name: PLUGIN_NAME,
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [PLUGIN_ID],
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
    read: {
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};

export const ELASTICSEARCH_FEATURE: ElasticsearchFeatureConfig = {
  id: PLUGIN_ID,
  management: {
    data: [PLUGIN_ID],
  },
  privileges: [
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['logs-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['traces-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['metrics-*-*']: ['read'],
      },
    },
    {
      ui: [],
      requiredClusterPrivileges: [],
      requiredIndexPrivileges: {
        ['synthetics-*-*']: ['read'],
      },
    },
  ],
};
