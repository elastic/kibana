/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { AdministrationSubTab } from '../types';
import { ENDPOINTS_TAB, EVENT_FILTERS_TAB, POLICIES_TAB, TRUSTED_APPS_TAB } from './translations';
import { AdministrationRouteSpyState } from '../../common/utils/route/types';
import { HOST_ISOLATION_EXCEPTIONS, BLOCKLIST } from '../../app/translations';

const TabNameMappedToI18nKey: Record<AdministrationSubTab, string> = {
  [AdministrationSubTab.endpoints]: ENDPOINTS_TAB,
  [AdministrationSubTab.policies]: POLICIES_TAB,
  [AdministrationSubTab.trustedApps]: TRUSTED_APPS_TAB,
  [AdministrationSubTab.eventFilters]: EVENT_FILTERS_TAB,
  [AdministrationSubTab.hostIsolationExceptions]: HOST_ISOLATION_EXCEPTIONS,
  [AdministrationSubTab.blocklist]: BLOCKLIST,
};

export function getBreadcrumbs(params: AdministrationRouteSpyState): ChromeBreadcrumb[] {
  return [
    ...(params?.tabName ? [params?.tabName] : []).map((tabName) => ({
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    })),
  ];
}
