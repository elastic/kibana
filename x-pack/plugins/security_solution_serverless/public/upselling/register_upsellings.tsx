/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type {
  MessageUpsellings,
  PageUpsellings,
  SectionUpsellings,
  UpsellingMessageId,
  UpsellingSectionId,
} from '@kbn/security-solution-upselling/service/types';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import React from 'react';
import { UPGRADE_INVESTIGATION_GUIDE } from '@kbn/security-solution-upselling/messages';
import { AppFeatureKey } from '@kbn/security-solution-features/keys';
import type { AppFeatureKeyType } from '@kbn/security-solution-features';
import { EndpointPolicyProtectionsLazy } from './sections/endpoint_management';
import type { SecurityProductTypes } from '../../common/config';
import { getProductAppFeatures } from '../../common/pli/pli_features';
import {
  EntityAnalyticsUpsellingLazy,
  OsqueryResponseActionsUpsellingSectionLazy,
  ThreatIntelligencePaywallLazy,
} from './lazy_upselling';
import { getProductTypeByPLI } from './hooks/use_product_type_by_pli';
import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';

interface UpsellingsConfig {
  pli: AppFeatureKeyType;
  component: React.ComponentType;
}

interface UpsellingsMessageConfig {
  pli: AppFeatureKeyType;
  message: string;
  id: UpsellingMessageId;
}

type UpsellingPages = Array<UpsellingsConfig & { pageName: SecurityPageName }>;
type UpsellingSections = Array<UpsellingsConfig & { id: UpsellingSectionId }>;
type UpsellingMessages = UpsellingsMessageConfig[];

export const registerUpsellings = (
  upselling: UpsellingService,
  productTypes: SecurityProductTypes,
  services: Services
) => {
  const enabledPLIsSet = new Set(getProductAppFeatures(productTypes));

  const upsellingPagesToRegister = upsellingPages.reduce<PageUpsellings>(
    (pageUpsellings, { pageName, pli, component }) => {
      if (!enabledPLIsSet.has(pli)) {
        pageUpsellings[pageName] = withServicesProvider(component, services);
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

  upselling.setPages(upsellingPagesToRegister);
  upselling.setSections(upsellingSectionsToRegister);
  upselling.setMessages(upsellingMessagesToRegister);
};

// Upsellings for entire pages, linked to a SecurityPageName
export const upsellingPages: UpsellingPages = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    pageName: SecurityPageName.entityAnalytics,
    pli: AppFeatureKey.advancedInsights,
    component: () => (
      <EntityAnalyticsUpsellingLazy
        requiredProduct={getProductTypeByPLI(AppFeatureKey.advancedInsights) ?? undefined}
      />
    ),
  },
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
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    id: 'osquery_automated_response_actions',
    pli: AppFeatureKey.osqueryAutomatedResponseActions,
    component: () => (
      <OsqueryResponseActionsUpsellingSectionLazy
        requiredPLI={AppFeatureKey.osqueryAutomatedResponseActions}
      />
    ),
  },
  {
    id: 'endpointPolicyProtections',
    pli: AppFeatureKey.endpointPolicyProtections,
    component: EndpointPolicyProtectionsLazy,
  },
];

// Upsellings for sections, linked by arbitrary ids
export const upsellingMessages: UpsellingMessages = [
  {
    id: 'investigation_guide',
    pli: AppFeatureKey.investigationGuide,
    message: UPGRADE_INVESTIGATION_GUIDE(
      getProductTypeByPLI(AppFeatureKey.investigationGuide) ?? ''
    ),
  },
];
