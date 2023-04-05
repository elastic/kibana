/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { usersModel } from '../../store';
import { UsersTableType } from '../../store/model';
import { getUsersDetailsUrl } from '../../../../common/components/link_to/redirect_to_users';

import * as i18n from '../translations';
import type { UsersRouteSpyState } from '../../../../common/utils/route/types';
import { SecurityPageName } from '../../../../app/types';
import type { GetSecuritySolutionUrl } from '../../../../common/components/link_to';

export const type = usersModel.UsersType.details;

const TabNameMappedToI18nKey: Record<UsersTableType, string> = {
  [UsersTableType.allUsers]: i18n.NAVIGATION_ALL_USERS_TITLE,
  [UsersTableType.authentications]: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
  [UsersTableType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [UsersTableType.risk]: i18n.NAVIGATION_RISK_TITLE,
  [UsersTableType.events]: i18n.NAVIGATION_EVENTS_TITLE,
  [UsersTableType.risk]: i18n.NAVIGATION_RISK_TITLE,
};

export const getTrailingBreadcrumbs = (
  params: UsersRouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName != null) {
    breadcrumb = [
      {
        text: params.detailName,
        href: getSecuritySolutionUrl({
          path: getUsersDetailsUrl(params.detailName, ''),
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
