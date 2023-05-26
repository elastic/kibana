/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { lazy } from 'react';
import type { UpsellingService } from '@kbn/security-solution-plugin/public';
import { SecurityPageName, AppFeatureKey } from '@kbn/security-solution-plugin/common';
import type {
  PageUpsellings,
  SectionUpsellings,
  UpsellingSectionId,
} from '@kbn/security-solution-plugin/public';

import type { SecurityProductLineIds } from '../../../common/config';
import { getProductAppFeatures } from '../../../common/pli/pli_features';

const GenericUpsellingPageLazy = lazy(() => import('./pages/generic_upselling_page'));
const GenericUpsellingSectionLazy = lazy(() => import('./pages/generic_upselling_section'));

interface UpsellingsConfig {
  feature: AppFeatureKey;
  component: React.ComponentType;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;

export const registerUpsellings = (
  upselling: UpsellingService,
  projectPLIs: SecurityProductLineIds
) => {
  const PLIsFeatures = getProductAppFeatures(projectPLIs);

  const upsellingPages = getUpsellingPages(projectPLIs).reduce<PageUpsellings>(
    (pageUpsellings, { pageName, feature, component }) => {
      if (!PLIsFeatures[feature]) {
        pageUpsellings[pageName] = component;
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSections = getUpsellingSections(projectPLIs).reduce<SectionUpsellings>(
    (sectionUpsellings, { id, feature, component }) => {
      if (!PLIsFeatures[feature]) {
        sectionUpsellings[id] = component;
      }
      return sectionUpsellings;
    },
    {}
  );

  upselling.registerPages(upsellingPages);
  upselling.registerSections(upsellingSections);
};

// Upselling configuration for pages and sections components
const getUpsellingPages = (projectPLIs: SecurityProductLineIds): UpsellingPages => [
  {
    pageName: SecurityPageName.entityAnalytics,
    feature: AppFeatureKey.advancedInsights,
    component: () => <GenericUpsellingPageLazy projectPLIs={projectPLIs} />,
  },
];

const getUpsellingSections = (projectPLIs: SecurityProductLineIds): UpsellingSections => [
  {
    id: 'entity_analytics_panel',
    feature: AppFeatureKey.advancedInsights,
    component: () => <GenericUpsellingSectionLazy projectPLIs={projectPLIs} />,
  },
];
