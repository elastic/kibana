/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig } from '../../../../features/common';
import { DEFAULT_APP_CATEGORIES } from '../../../../../../src/core/server';
import {
  SEARCH_SESSIONS_MANAGEMENT_ID,
  SEARCH_SESSIONS_FEATURE_ID,
} from '../../../../../../src/plugins/data/common';

export const API_SEARCH_SESSION_CREATE_ROLE = `${SEARCH_SESSIONS_FEATURE_ID}-create`;

export const searchSessionsFeature: KibanaFeatureConfig = {
  id: SEARCH_SESSIONS_FEATURE_ID,
  name: i18n.translate('xpack.data.searchSessions.featureName', {
    defaultMessage: 'Search Sessions',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  order: 1750,
  app: [],
  management: {
    kibana: [SEARCH_SESSIONS_MANAGEMENT_ID],
  },
  privileges: {
    all: {
      savedObject: {
        all: ['background-session'],
        read: [],
      },
      api: [`${SEARCH_SESSIONS_FEATURE_ID}-create`],
      management: {
        kibana: [SEARCH_SESSIONS_FEATURE_ID],
      },
      ui: ['create'],
    },
    read: {
      savedObject: {
        all: [],
        read: [],
      },
      api: [],
      management: {
        kibana: [],
      },
      ui: [],
    },
  },
};
