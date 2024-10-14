/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

const INVENTORY_SERVER_FEATURE_ID = 'inventory';

export const INVENTORY_SERVER_FEATURE = {
  id: INVENTORY_SERVER_FEATURE_ID,
  name: i18n.translate('xpack.inventory.featureRegistry.inventoryFeatureName', {
    defaultMessage: 'Inventory',
  }),
  order: 1000,
  category: DEFAULT_APP_CATEGORIES.observability,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [INVENTORY_SERVER_FEATURE_ID],
  catalogue: [INVENTORY_SERVER_FEATURE_ID],
  alerting: [],
  // see x-pack/plugins/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: [INVENTORY_SERVER_FEATURE_ID],
      api: [INVENTORY_SERVER_FEATURE_ID],
      catalogue: [INVENTORY_SERVER_FEATURE_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        alert: {
          all: [],
        },
        rule: {
          all: [],
        },
      },
      ui: ['show', 'save'],
    },
    read: {
      app: [INVENTORY_SERVER_FEATURE_ID],
      api: [INVENTORY_SERVER_FEATURE_ID],
      catalogue: [INVENTORY_SERVER_FEATURE_ID],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        alert: {
          read: [],
        },
        rule: {
          read: [],
        },
      },
      ui: ['show'],
    },
  },
};
