/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from '../../../../../../../src/core/public';
import { usersModel } from '../../store';
import { UsersTableType } from '../../store/model';
import { getUsersDetailsUrl } from '../../../common/components/link_to/redirect_to_users';

import * as i18n from '../translations';
import { UsersRouteSpyState } from '../../../common/utils/route/types';
import { GetUrlForApp } from '../../../common/components/navigation/types';
import { APP_UI_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';

export const type = usersModel.UsersType.details;

const TabNameMappedToI18nKey: Record<UsersTableType, string> = {
  [UsersTableType.allUsers]: i18n.NAVIGATION_ALL_USERS_TITLE,
  [UsersTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [UsersTableType.risk]: i18n.NAVIGATION_RISK_TITLE,
  [UsersTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
  [UsersTableType.alerts]: i18n.NAVIGATION_ALERTS_TITLE,
};

export const getBreadcrumbs = (
  params: UsersRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getUrlForApp(APP_UI_ID, {
        path: !isEmpty(search[0]) ? search[0] : '',
        deepLinkId: SecurityPageName.users,
      }),
    },
  ];

  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: getUrlForApp(APP_UI_ID, {
          path: getUsersDetailsUrl(params.detailName, !isEmpty(search[0]) ? search[0] : ''),
          deepLinkId: SecurityPageName.users,
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
