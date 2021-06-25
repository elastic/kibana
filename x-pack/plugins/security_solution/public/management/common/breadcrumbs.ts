/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { isEmpty } from 'lodash/fp';
import { AdministrationSubTab } from '../types';
import { ENDPOINTS_TAB, EVENT_FILTERS_TAB, POLICIES_TAB, TRUSTED_APPS_TAB } from './translations';
import { AdministrationRouteSpyState } from '../../common/utils/route/types';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { ADMINISTRATION } from '../../app/translations';
import { APP_ID, SecurityPageName } from '../../../common/constants';

const TabNameMappedToI18nKey: Record<AdministrationSubTab, string> = {
  [AdministrationSubTab.endpoints]: ENDPOINTS_TAB,
  [AdministrationSubTab.policies]: POLICIES_TAB,
  [AdministrationSubTab.trustedApps]: TRUSTED_APPS_TAB,
  [AdministrationSubTab.eventFilters]: EVENT_FILTERS_TAB,
};

export function getBreadcrumbs(
  params: AdministrationRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] {
  return [
    {
      text: ADMINISTRATION,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.administration}`, {
        path: !isEmpty(search[0]) ? search[0] : '',
      }),
    },
    ...(params?.tabName ? [params?.tabName] : []).map((tabName) => ({
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    })),
  ];
}
