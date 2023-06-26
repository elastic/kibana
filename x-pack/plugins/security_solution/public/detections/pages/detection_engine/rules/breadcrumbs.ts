/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import {
  getRuleDetailsTabUrl,
  getRuleDetailsUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import * as i18nRules from './translations';
import type { RouteSpyState } from '../../../../common/utils/route/types';
import { SecurityPageName } from '../../../../app/types';
import { RULES_PATH } from '../../../../../common/constants';
import type { GetSecuritySolutionUrl } from '../../../../common/components/link_to';
import {
  RuleDetailTabs,
  RULE_DETAILS_TAB_NAME,
} from '../../../../detection_engine/rule_details_ui/pages/rule_details';
import { DELETED_RULE } from '../../../../detection_engine/rule_details_ui/pages/rule_details/translations';

const getRuleDetailsTabName = (tabName: string): string => {
  return RULE_DETAILS_TAB_NAME[tabName] ?? RULE_DETAILS_TAB_NAME[RuleDetailTabs.alerts];
};

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

  if (params.detailName && params.state?.ruleName && params.tabName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: getRuleDetailsTabName(params.tabName),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(params.detailName, params.tabName, ''),
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

  if (!isRuleEditPage(params.pathName) && params.state && !params.state.isExistingRule) {
    breadcrumb = [...breadcrumb, { text: DELETED_RULE, href: '' }];
  }

  return breadcrumb;
};
