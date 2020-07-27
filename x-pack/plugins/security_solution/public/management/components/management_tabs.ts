/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AdministrationSubTab } from '../types';
import { SecurityPageName } from '../../app/types';

export const managementTabs = {
  [AdministrationSubTab.hosts]: {
    name: i18n.translate('xpack.securitySolution.managementTabs.hosts', {
      defaultMessage: 'Hosts',
    }),
    id: AdministrationSubTab.hosts,
    href: '/hosts',
    urlKey: 'administration',
    pageId: SecurityPageName.administration,
  },
  [AdministrationSubTab.policies]: {
    name: i18n.translate('xpack.securitySolution.managementTabs.policies', {
      defaultMessage: 'Policies',
    }),
    id: AdministrationSubTab.policies,
    href: '/policy',
    urlKey: 'administration',
    pageId: SecurityPageName.administration,
  },
};
