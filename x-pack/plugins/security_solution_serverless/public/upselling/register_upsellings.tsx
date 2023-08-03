/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPageName, AppFeatureKey } from '@kbn/security-solution-plugin/common';
import type {
  UpsellingService,
  PageUpsellings,
  SectionUpsellings,
  UpsellingSectionId,
} from '@kbn/security-solution-plugin/public';
import React, { lazy } from 'react';
import type {
  MessageUpsellings,
  UpsellingMessageId,
} from '@kbn/security-solution-plugin/public/common/lib/upsellings/types';
import { OsqueryResponseActionsUpsellingSectionlLazy } from './pages/osquery_automated_response_actions';
import type { SecurityProductTypes } from '../../common/config';
import { getProductAppFeatures } from '../../common/pli/pli_features';
import investigationGuideUpselling from './pages/investigation_guide_upselling';
const ThreatIntelligencePaywallLazy = lazy(() => import('./pages/threat_intelligence_paywall'));

interface UpsellingsConfig {
  pli: AppFeatureKey;
  component: React.ComponentType;
}

interface UpsellingsMessageConfig {
  pli: AppFeatureKey;
  message: string;
  id: UpsellingMessageId;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;
type UpsellingMessages = UpsellingsMessageConfig[];

export const registerUpsellings = (
  upselling: UpsellingService,
  productTypes: SecurityProductTypes
) => {
  const enabledPLIsSet = new Set(getProductAppFeatures(productTypes));

  const upsellingPagesToRegister = upsellingPages.reduce<PageUpsellings>(
    (pageUpsellings, { pageName, pli, component }) => {
      if (!enabledPLIsSet.has(pli)) {
        pageUpsellings[pageName] = component;
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSectionsToRegister = upsellingSections.reduce<SectionUpsellings>(
    (sectionUpsellings, { id, pli, component }) => {
      if (!enabledPLIsSet.has(pli)) {
        sectionUpsellings[id] = component;
      }
      return sectionUpsellings;
    },
    {}
  );

  const upsellingMessagesToRegister = upsellingMessages.reduce<MessageUpsellings>(
    (messagesUpsellings, { id, pli, message }) => {
      if (!enabledPLIsSet.has(pli)) {
        messagesUpsellings[id] = message;
      }
      return messagesUpsellings;
    },
    {}
  );

  upselling.registerPages(upsellingPagesToRegister);
  upselling.registerSections(upsellingSectionsToRegister);
  upselling.registerMessages(upsellingMessagesToRegister);
};

// Upsellings for entire pages, linked to a SecurityPageName
export const upsellingPages: UpsellingPages = [
  // Sample code for registering a Upselling page
  // Make sure the component is lazy loaded `const GenericUpsellingPageLazy = lazy(() => import('./pages/generic_upselling_page'));`
  // {
  //   pageName: SecurityPageName.entityAnalytics,
  //   pli: AppFeatureKey.advancedInsights,
  //   component: () => <GenericUpsellingPageLazy requiredPLI={AppFeatureKey.advancedInsights} />,
  // },
  {
    pageName: SecurityPageName.threatIntelligence,
    pli: AppFeatureKey.threatIntelligence,
    component: () => (
      <ThreatIntelligencePaywallLazy requiredPLI={AppFeatureKey.threatIntelligence} />
    ),
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingSections: UpsellingSections = [
  // Sample code for registering a Upselling section
  // Make sure the component is lazy loaded `const GenericUpsellingSectionLazy = lazy(() => import('./pages/generic_upselling_section'));`
  // {
  //   id: 'entity_analytics_panel',
  //   pli: AppFeatureKey.advancedInsights,
  //   component: () => <GenericUpsellingSectionLazy requiredPLI={AppFeatureKey.advancedInsights} />,
  // },
  {
    id: 'osquery_automated_response_actions',
    pli: AppFeatureKey.osqueryAutomatedResponseActions,
    component: () => (
      <OsqueryResponseActionsUpsellingSectionlLazy
        requiredPLI={AppFeatureKey.osqueryAutomatedResponseActions}
      />
    ),
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingMessages: UpsellingMessages = [
  {
    id: 'investigation_guide',
    pli: AppFeatureKey.investigationGuide,
    message: investigationGuideUpselling(AppFeatureKey.investigationGuide),
  },
];
