/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AdministrationSubTab } from '../types';
import { SecurityPageName } from '../../app/types';
import { NavTab } from '../../common/components/navigation/types';

export const managementTabs: Record<string, NavTab> = {
  [AdministrationSubTab.endpoints]: {
    name: i18n.translate('xpack.securitySolution.managementTabs.hosts', {
      defaultMessage: 'Hosts',
    }),
    id: AdministrationSubTab.endpoints,
    href: `/${AdministrationSubTab.endpoints}`,
    urlKey: 'administration',
    pageId: SecurityPageName.administration,
    disabled: false,
  },
  [AdministrationSubTab.trustedApps]: {
    name: i18n.translate('xpack.securitySolution.managementTabs.trustedApps', {
      defaultMessage: 'Trusted Applications',
    }),
    id: AdministrationSubTab.trustedApps,
    href: `/${AdministrationSubTab.trustedApps}`,
    urlKey: 'administration',
    pageId: SecurityPageName.administration,
    disabled: false,
  },
};
