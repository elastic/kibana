/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ALERTS_PATH, RULES_PATH, EXCEPTIONS_PATH, SecurityPageName } from '../../common/constants';
import { ALERTS, DETECT, EXCEPTIONS, RULES } from '../app/translations';
import { LinkItem, FEATURE } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.detections,
  label: DETECT,
  url: ALERTS_PATH,
  globalNavEnabled: false,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.detect', {
      defaultMessage: 'Detect',
    }),
  ],
  items: [
    {
      id: SecurityPageName.alerts,
      label: ALERTS,
      url: ALERTS_PATH,
      globalNavEnabled: true,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.search.alerts', {
          defaultMessage: 'Alerts',
        }),
      ],
      globalSearchEnabled: true,
      globalNavOrder: 9001,
    },
    {
      id: SecurityPageName.rules,
      label: RULES,
      url: RULES_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.search.rules', {
          defaultMessage: 'Rules',
        }),
      ],
      globalSearchEnabled: true,
    },
    {
      id: SecurityPageName.exceptions,
      label: EXCEPTIONS,
      url: EXCEPTIONS_PATH,
      globalNavEnabled: false,
      globalSearchKeywords: [
        i18n.translate('xpack.securitySolution.search.exceptions', {
          defaultMessage: 'Exception lists',
        }),
      ],
      globalSearchEnabled: true,
    },
  ],
};
