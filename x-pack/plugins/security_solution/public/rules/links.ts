/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RULES_PATH,
  RULES_CREATE_PATH,
  EXCEPTIONS_PATH,
  RULES_LANDING_PATH,
  RULES_ADD_PATH,
  SERVER_APP_ID,
} from '../../common/constants';
import { ADD_RULES, CREATE_NEW_RULE, EXCEPTIONS, RULES, SIEM_RULES } from '../app/translations';
import { SecurityPageName } from '../app/types';
import { benchmarksLink } from '../cloud_security_posture/links';
import type { LinkItem } from '../common/links';
import { IconConsoleCloud } from '../common/icons/console_cloud';
import { IconRollup } from '../common/icons/rollup';

export const links: LinkItem = {
  id: SecurityPageName.rulesLanding,
  title: RULES,
  path: RULES_LANDING_PATH,
  hideTimeline: true,
  skipUrlState: true,
  capabilities: [`${SERVER_APP_ID}.show`],
  links: [
    {
      id: SecurityPageName.rules,
      title: SIEM_RULES,
      description: i18n.translate('xpack.securitySolution.appLinks.rulesDescription', {
        defaultMessage: 'Create and manage detection rules for threat detection and monitoring.',
      }),
      landingIcon: IconRollup,
      path: RULES_PATH,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.appLinks.rules', {
          defaultMessage: 'SIEM Rules',
        }),
      ],
      links: [
        {
          id: SecurityPageName.rulesAdd,
          title: ADD_RULES,
          path: RULES_ADD_PATH,
          skipUrlState: true,
          hideTimeline: true,
        },
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
      landingIcon: IconConsoleCloud,
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
      label: i18n.translate('xpack.securitySolution.appLinks.category.management', {
        defaultMessage: 'Management',
      }),
      linkIds: [
        SecurityPageName.rules,
        SecurityPageName.cloudSecurityPostureBenchmarks,
        SecurityPageName.exceptions,
      ],
    },
  ],
};
