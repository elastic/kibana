/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { UpsellingService } from '@kbn/security-solution-plugin/public';
import { SecurityPageName, type AppFeatureKey } from '@kbn/security-solution-plugin/common';
import type {
  PageUpsellings,
  SectionUpsellings,
  UpsellingSectionId,
} from '@kbn/security-solution-plugin/public';
import type { ServerlessSecurityPLIs } from '../../../common/config';
import { CasesUpselling } from './pages/cases_upselling';
import {
  PrebuiltRulesTooltipUpselling,
  RulesResponseActionsUpselling,
} from './pages/rules_upselling';
import { getProjectPLIsFeatures } from '../../../common/pli/pli_features';

interface UpsellingsConfig {
  feature: AppFeatureKey;
  component: React.ComponentType;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;

export const registerUpsellings = (
  upselling: UpsellingService,
  projectSkus: ServerlessSecurityPLIs
) => {
  const skusFeatures = getProjectPLIsFeatures(projectSkus);

  const upsellingPages = getUpsellingPages(projectSkus).reduce<PageUpsellings>(
    (pageUpsellings, { pageName, feature, component }) => {
      if (!skusFeatures[feature]) {
        pageUpsellings[pageName] = component;
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSections = getUpsellingSections(projectSkus).reduce<SectionUpsellings>(
    (sectionUpsellings, { id, feature, component }) => {
      if (!skusFeatures[feature]) {
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

// TODO: lazy load these components
const getUpsellingPages = (projectSkus: ServerlessSecurityPLIs): UpsellingPages => [
  {
    pageName: SecurityPageName.case,
    feature: 'cases_base',
    component: () => <CasesUpselling projectSkus={projectSkus} />,
  },
];

const getUpsellingSections = (projectSkus: ServerlessSecurityPLIs): UpsellingSections => [
  {
    id: 'rules_load_prepackaged_tooltip',
    feature: 'rules_load_prepackaged',
    component: PrebuiltRulesTooltipUpselling,
  },
  {
    id: 'rules_response_actions',
    feature: 'rules_response_actions',
    component: () => <RulesResponseActionsUpselling projectPLIs={projectSkus} />,
  },
];
