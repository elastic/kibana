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
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import {
  EndpointAgentTamperProtectionLazy,
  EndpointPolicyProtectionsLazy,
  EndpointProtectionUpdatesLazy,
  RuleDetailsEndpointExceptionsLazy,
} from './sections/endpoint_management';
import type { SecurityProductTypes } from '../../common/config';
import { getProductProductFeatures } from '../../common/pli/pli_features';
import {
  EndpointExceptionsDetailsUpsellingLazy,
  EntityAnalyticsUpsellingLazy,
  OsqueryResponseActionsUpsellingSectionLazy,
  ThreatIntelligencePaywallLazy,
} from './lazy_upselling';
import { getProductTypeByPLI } from './hooks/use_product_type_by_pli';
import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';

interface UpsellingsConfig {
  pli: ProductFeatureKeyType;
  component: React.ComponentType;
}

interface UpsellingsMessageConfig {
  pli: ProductFeatureKeyType;
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
  const enabledPLIsSet = new Set(getProductProductFeatures(productTypes));

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

// Upselling for entire pages, linked to a SecurityPageName
export const upsellingPages: UpsellingPages = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    pageName: SecurityPageName.entityAnalytics,
    pli: ProductFeatureKey.advancedInsights,
    component: () => (
      <EntityAnalyticsUpsellingLazy
        requiredProduct={getProductTypeByPLI(ProductFeatureKey.advancedInsights) ?? undefined}
      />
    ),
  },
  {
    pageName: SecurityPageName.threatIntelligence,
    pli: ProductFeatureKey.threatIntelligence,
    component: () => (
      <ThreatIntelligencePaywallLazy requiredPLI={ProductFeatureKey.threatIntelligence} />
    ),
  },
  {
    pageName: SecurityPageName.exceptions,
    pli: ProductFeatureKey.endpointExceptions,
    component: () => (
      <EndpointExceptionsDetailsUpsellingLazy requiredPLI={ProductFeatureKey.endpointExceptions} />
    ),
  },
];

// Upselling for sections, linked by arbitrary ids
export const upsellingSections: UpsellingSections = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    id: 'osquery_automated_response_actions',
    pli: ProductFeatureKey.osqueryAutomatedResponseActions,
    component: () => (
      <OsqueryResponseActionsUpsellingSectionLazy
        requiredPLI={ProductFeatureKey.osqueryAutomatedResponseActions}
      />
    ),
  },
  {
    id: 'endpoint_agent_tamper_protection',
    pli: ProductFeatureKey.endpointAgentTamperProtection,
    component: EndpointAgentTamperProtectionLazy,
  },
  {
    id: 'endpointPolicyProtections',
    pli: ProductFeatureKey.endpointPolicyProtections,
    component: EndpointPolicyProtectionsLazy,
  },
  {
    id: 'ruleDetailsEndpointExceptions',
    pli: ProductFeatureKey.endpointExceptions,
    component: RuleDetailsEndpointExceptionsLazy,
  },
  {
    id: 'endpoint_protection_updates',
    pli: ProductFeatureKey.endpointProtectionUpdates,
    component: EndpointProtectionUpdatesLazy,
  },
];

// Upselling for sections, linked by arbitrary ids
export const upsellingMessages: UpsellingMessages = [
  {
    id: 'investigation_guide',
    pli: ProductFeatureKey.investigationGuide,
    message: UPGRADE_INVESTIGATION_GUIDE(
      getProductTypeByPLI(ProductFeatureKey.investigationGuide) ?? ''
    ),
  },
];
