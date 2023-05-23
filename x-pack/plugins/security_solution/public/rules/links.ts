/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LinkCategoryType } from '@kbn/security-solution-side-nav';
import {
  RULES_PATH,
  RULES_CREATE_PATH,
  EXCEPTIONS_PATH,
  RULES_LANDING_PATH,
} from '../../common/constants';
import { CREATE_NEW_RULE, EXCEPTIONS, RULES, SIEM_RULES } from '../app/translations';
import { SecurityPageName } from '../app/types';
import { benchmarksLink } from '../cloud_security_posture/links';
import type { LinkItem } from '../common/links';
import { IconExceptionLists } from './icons/exception_lists';
import { IconSiemRules } from './icons/siem_rules';

export const links: LinkItem = {
  id: SecurityPageName.rulesLanding,
  title: RULES,
  path: RULES_LANDING_PATH,
  globalSearchDisabled: true,
  links: [
    {
      id: SecurityPageName.rules,
      title: SIEM_RULES,
      description: i18n.translate('xpack.securitySolution.appLinks.rulesDescription', {
        defaultMessage:
          "Create and manage rules to check for suspicious source events, and create alerts when a rule's conditions are met.",
      }),
      landingIcon: IconSiemRules,
      path: RULES_PATH,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.rules', {
          defaultMessage: 'Rules',
        }),
      ],
      links: [
        {
          id: SecurityPageName.rulesCreate,
          title: CREATE_NEW_RULE,
          path: RULES_CREATE_PATH,
          skipUrlState: true,
          hideTimeline: true,
        },
      ],
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS,
      description: i18n.translate('xpack.securitySolution.appLinks.exceptionsDescription', {
        defaultMessage:
          'Create and manage shared exception lists to prevent the creation of unwanted alerts.',
      }),
      landingIcon: IconExceptionLists,
      path: EXCEPTIONS_PATH,
      skipUrlState: true,
      hideTimeline: true,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
    },
    benchmarksLink,
  ],
  categories: [
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.siemRules', {
        defaultMessage: 'Security Detection Rules',
      }),
      linkIds: [SecurityPageName.rules, SecurityPageName.exceptions],
    },
    {
      type: LinkCategoryType.separator,
      linkIds: [benchmarksLink.id],
    },
  ],
};
