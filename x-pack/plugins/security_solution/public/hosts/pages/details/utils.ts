/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from '../../../../../../../src/core/public';
import { hostsModel } from '../../store';
import { HostsTableType } from '../../store/model';
import { getHostDetailsUrl } from '../../../common/components/link_to/redirect_to_hosts';

import * as i18n from '../translations';
import { HostRouteSpyState } from '../../../common/utils/route/types';
import { GetUrlForApp } from '../../../common/components/navigation/types';
import { APP_UI_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';

export const type = hostsModel.HostsType.details;

const TabNameMappedToI18nKey: Record<HostsTableType, string> = {
  [HostsTableType.hosts]: i18n.NAVIGATION_ALL_HOSTS_TITLE,
  [HostsTableType.authentications]: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  [HostsTableType.uncommonProcesses]: i18n.NAVIGATION_UNCOMMON_PROCESSES_TITLE,
  [HostsTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [HostsTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
  [HostsTableType.alerts]: i18n.NAVIGATION_ALERTS_TITLE,
  [HostsTableType.risk]: i18n.NAVIGATION_HOST_RISK_TITLE,
};

export const getBreadcrumbs = (
  params: HostRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getUrlForApp(APP_UI_ID, {
        path: !isEmpty(search[0]) ? search[0] : '',
        deepLinkId: SecurityPageName.hosts,
      }),
    },
  ];

  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: getUrlForApp(APP_UI_ID, {
          path: getHostDetailsUrl(params.detailName, !isEmpty(search[0]) ? search[0] : ''),
          deepLinkId: SecurityPageName.hosts,
        }),
      },
    ];
  }

  if (params.tabName != null) {
    const tabName = get('tabName', params);
    if (!tabName) return breadcrumb;

    breadcrumb = [
      ...breadcrumb,
      {
        text: TabNameMappedToI18nKey[tabName],
        href: '',
      },
    ];
  }
  return breadcrumb;
};
