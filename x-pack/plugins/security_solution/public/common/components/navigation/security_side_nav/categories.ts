/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LinkCategoryType, type SeparatorLinkCategory } from '@kbn/security-solution-navigation';
import { SecurityPageName } from '../../../../../common';

export const CATEGORIES: SeparatorLinkCategory[] = [
  {
    type: LinkCategoryType.separator,
    linkIds: [SecurityPageName.dashboards],
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
      SecurityPageName.timelines,
      SecurityPageName.threatIntelligence,
      SecurityPageName.exploreLanding,
    ],
  },
];
