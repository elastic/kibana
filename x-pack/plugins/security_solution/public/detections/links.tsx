/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { AppNavLinkStatus } from '@kbn/core/public';
import { SecurityPageName } from '../../common/constants';
import { FEATURE } from '../common/links';
import { ALERTS, DETECT, EXCEPTIONS, RULES } from '../app/translations';

export const DETECTIONS_PATH = '/detections' as const;
export const ALERTS_PATH = '/alerts' as const;
export const RULES_PATH = '/rules' as const;
export const EXCEPTIONS_PATH = '/exceptions' as const;

export const linksConfig = {
  id: SecurityPageName.detections,
  title: DETECT,
  path: ALERTS_PATH,
  navLinkStatus: AppNavLinkStatus.hidden,
  features: [FEATURE.general],
  keywords: [
    i18n.translate('xpack.securitySolution.search.detect', {
      defaultMessage: 'Detect',
    }),
  ],
  deepLinks: [
    {
      id: SecurityPageName.alerts,
      title: ALERTS,
      path: ALERTS_PATH,
      navLinkStatus: AppNavLinkStatus.visible,
      keywords: [
        i18n.translate('xpack.securitySolution.search.alerts', {
          defaultMessage: 'Alerts',
        }),
      ],
      searchable: true,
      order: 9001,
    },
    {
      id: SecurityPageName.rules,
      title: RULES,
      path: RULES_PATH,
      navLinkStatus: AppNavLinkStatus.hidden,
      keywords: [
        i18n.translate('xpack.securitySolution.search.rules', {
          defaultMessage: 'Rules',
        }),
      ],
      searchable: true,
    },
    {
      id: SecurityPageName.exceptions,
      title: EXCEPTIONS,
      path: EXCEPTIONS_PATH,
      navLinkStatus: AppNavLinkStatus.hidden,
      keywords: [
        i18n.translate('xpack.securitySolution.search.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
      searchable: true,
    },
  ],
};
