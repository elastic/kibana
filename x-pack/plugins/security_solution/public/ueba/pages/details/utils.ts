/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from '../../../../../../../src/core/public';
import { uebaModel } from '../../store';
import { UebaTableType } from '../../store/model';
import { getUebaDetailsUrl } from '../../../common/components/link_to/redirect_to_ueba';

import * as i18n from '../translations';
import { UebaRouteSpyState } from '../../../common/utils/route/types';
import { GetUrlForApp } from '../../../common/components/navigation/types';
import { APP_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';

export const type = uebaModel.UebaType.details;

const TabNameMappedToI18nKey: Record<UebaTableType, string> = {
  [UebaTableType.hostRules]: i18n.HOST_RULES,
  [UebaTableType.hostTactics]: i18n.HOST_TACTICS,
  [UebaTableType.riskScore]: i18n.RISK_SCORE_TITLE,
  [UebaTableType.userRules]: i18n.USER_RULES,
};

export const getBreadcrumbs = (
  params: UebaRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getUrlForApp(APP_ID, {
        path: !isEmpty(search[0]) ? search[0] : '',
        deepLinkId: SecurityPageName.ueba,
      }),
    },
  ];

  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: getUrlForApp(APP_ID, {
          path: getUebaDetailsUrl(params.detailName, !isEmpty(search[0]) ? search[0] : ''),
          deepLinkId: SecurityPageName.ueba,
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
