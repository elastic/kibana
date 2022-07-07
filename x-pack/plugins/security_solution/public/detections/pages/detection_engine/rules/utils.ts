/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { getRuleDetailsUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18nRules from './translations';
import { RouteSpyState } from '../../../../common/utils/route/types';
import { SecurityPageName } from '../../../../app/types';
import { RULES_PATH } from '../../../../../common/constants';
import { RuleStep, RuleStepsOrder } from './types';
import { GetSecuritySolutionUrl } from '../../../../common/components/link_to';

export const ruleStepsOrder: RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions,
];

const isRuleCreatePage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/create');

const isRuleEditPage = (pathname: string) =>
  pathname.includes(RULES_PATH) && pathname.includes('/edit');

export const getTrailingBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.ruleName,
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsUrl(params.detailName, ''),
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
