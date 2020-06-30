/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ACTIONS_FEATURE = {
  id: 'actions',
  name: i18n.translate('xpack.actions.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Actions',
  }),
  navLinkId: 'actions',
  app: [],
  privileges: {
    all: {
      app: [],
      api: [],
      catalogue: [],
      savedObject: {
        all: ['action'],
        read: [],
      },
      ui: [],
    },
    read: {
      app: [],
      api: [],
      catalogue: [],
      savedObject: {
        all: [],
        read: ['action'],
      },
      ui: [],
    },
  },
};
