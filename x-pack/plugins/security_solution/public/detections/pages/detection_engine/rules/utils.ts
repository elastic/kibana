/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChromeBreadcrumb } from '../../../../../../../../src/core/public';
import {
  getDetectionEngineTabUrl,
  getRulesUrl,
  getRuleDetailsUrl,
  getCreateRuleUrl,
  getEditRuleUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18nDetections from '../translations';
import * as i18nRules from './translations';
import { RouteSpyState } from '../../../../common/utils/route/types';
import { GetUrlForApp } from '../../../../common/components/navigation/types';
import { SecurityPageName } from '../../../../app/types';
import { APP_ID } from '../../../../../common/constants';

const getTabBreadcrumb = (pathname: string, search: string[], getUrlForApp: GetUrlForApp) => {
  const tabPath = pathname.split('/')[1];

  if (tabPath === 'alerts') {
    return {
      text: i18nDetections.ALERT,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getDetectionEngineTabUrl(tabPath, !isEmpty(search[0]) ? search[0] : ''),
      }),
    };
  }

  if (tabPath === 'rules') {
    return {
      text: i18nRules.PAGE_TITLE,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getRulesUrl(!isEmpty(search[0]) ? search[0] : ''),
      }),
    };
  }
};

const isRuleCreatePage = (pathname: string) =>
  pathname.includes('/rules') && pathname.includes('/create');

const isRuleEditPage = (pathname: string) =>
  pathname.includes('/rules') && pathname.includes('/edit');

export const getBreadcrumbs = (
  params: RouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb = [
    {
      text: i18nDetections.PAGE_TITLE,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: !isEmpty(search[0]) ? search[0] : '',
      }),
    },
  ];

  const tabBreadcrumb = getTabBreadcrumb(params.pathName, search, getUrlForApp);

  if (tabBreadcrumb) {
    breadcrumb = [...breadcrumb, tabBreadcrumb];
  }

  if (params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.ruleName,
        href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
          path: getRuleDetailsUrl(params.detailName, !isEmpty(search[0]) ? search[0] : ''),
        }),
      },
    ];
  }

  if (isRuleCreatePage(params.pathName)) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.ADD_PAGE_TITLE,
        href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
          path: getCreateRuleUrl(!isEmpty(search[0]) ? search[0] : ''),
        }),
      },
    ];
  }

  if (isRuleEditPage(params.pathName) && params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.EDIT_PAGE_TITLE,
        href: getUrlForApp(`${APP_ID}:${SecurityPageName.detections}`, {
          path: getEditRuleUrl(params.detailName, !isEmpty(search[0]) ? search[0] : ''),
        }),
      },
    ];
  }

  return breadcrumb;
};
