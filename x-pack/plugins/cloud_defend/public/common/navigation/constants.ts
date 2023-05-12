/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CloudDefendPage, CloudDefendPageNavigationItem } from './types';

const NAV_ITEMS_NAMES = {
  POLICIES: i18n.translate('xpack.cloudDefend.navigation.policiesNavItemLabel', {
    defaultMessage: 'Container Workload Protection',
  }),
};

/** The base path for all cloud defend pages. */
export const CLOUD_DEFEND_BASE_PATH = '/cloud_defend';

export const cloudDefendPages: Record<CloudDefendPage, CloudDefendPageNavigationItem> = {
  policies: {
    name: NAV_ITEMS_NAMES.POLICIES,
    path: `${CLOUD_DEFEND_BASE_PATH}/policies`,
    id: 'cloud_defend-policies',
  },
};
