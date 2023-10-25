/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  LinkCategoryType,
  type LinkCategory,
  type SeparatorLinkCategory,
} from '@kbn/security-solution-navigation';
import { ExternalPageName } from './links/constants';
import type { ProjectPageName } from './links/types';

export const CATEGORIES: Array<SeparatorLinkCategory<ProjectPageName>> = [
  {
    type: LinkCategoryType.separator,
    linkIds: [ExternalPageName.discover, SecurityPageName.dashboards],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [
      SecurityPageName.rulesLanding,
      SecurityPageName.alerts,
      SecurityPageName.cloudSecurityPostureFindings,
      SecurityPageName.case,
    ],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [
      SecurityPageName.investigations,
      SecurityPageName.threatIntelligence,
      SecurityPageName.exploreLanding,
    ],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [ExternalPageName.fleet, SecurityPageName.assets],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.mlLanding],
  },
];

export const FOOTER_CATEGORIES: Array<LinkCategory<ProjectPageName>> = [
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.landing, ExternalPageName.devTools],
  },
  {
    type: LinkCategoryType.accordion,
    label: i18n.translate('xpack.securitySolutionServerless.nav.projectSettings.title', {
      defaultMessage: 'Project settings',
    }),
    iconType: 'gear',
    linkIds: [
      ExternalPageName.management,
      ExternalPageName.integrationsSecurity,
      ExternalPageName.cloudUsersAndRoles,
      ExternalPageName.cloudPerformance,
      ExternalPageName.cloudBilling,
    ],
  },
];
