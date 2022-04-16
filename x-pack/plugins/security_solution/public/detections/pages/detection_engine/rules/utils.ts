/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from '@kbn/core/public';
import {
  getRulesUrl,
  getRuleDetailsUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18nRules from './translations';
import { RouteSpyState } from '../../../../common/utils/route/types';
import { GetUrlForApp } from '../../../../common/components/navigation/types';
import { SecurityPageName } from '../../../../app/types';
import { APP_UI_ID, RULES_PATH } from '../../../../../common/constants';
import { RuleStep, RuleStepsOrder } from './types';

export const ruleStepsOrder: RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions,
];

const getRulesBreadcrumb = (pathname: string, search: string[], getUrlForApp: GetUrlForApp) => {
  const tabPath = pathname.split('/')[1];

  if (tabPath === 'rules') {
    return {
      text: i18nRules.PAGE_TITLE,
      href: getUrlForApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRulesUrl(!isEmpty(search[0]) ? search[0] : ''),
      }),
    };
  }
};

const isRuleCreatePage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/create');

const isRuleEditPage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/edit');

export const getBreadcrumbs = (
  params: RouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  const rulesBreadcrumb = getRulesBreadcrumb(params.pathName, search, getUrlForApp);

  if (rulesBreadcrumb) {
    breadcrumb = [...breadcrumb, rulesBreadcrumb];
  }

  if (params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.ruleName,
        href: getUrlForApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.rules,
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
        href: '',
      },
    ];
  }

  if (isRuleEditPage(params.pathName) && params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.EDIT_PAGE_TITLE,
        href: '',
      },
    ];
  }

  return breadcrumb;
};
