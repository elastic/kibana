/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import {
  UPGRADE_INVESTIGATION_GUIDE,
  UPGRADE_INVESTIGATION_GUIDE_INTERACTIONS,
} from '@kbn/security-solution-upselling/messages';
import type {
  UpsellingMessageId,
  UpsellingSectionId,
} from '@kbn/security-solution-upselling/service/types';
import React from 'react';
import { CloudSecurityPostureIntegrationPliBlockLazy } from './sections/cloud_security_posture';
import {
  EndpointAgentTamperProtectionLazy,
  EndpointPolicyProtectionsLazy,
  EndpointProtectionUpdatesLazy,
  RuleDetailsEndpointExceptionsLazy,
} from './sections/endpoint_management';
import { getProductTypeByPLI } from './hooks/use_product_type_by_pli';
import {
  AttackDiscoveryUpsellingPageLazy,
  EndpointExceptionsDetailsUpsellingLazy,
  EntityAnalyticsUpsellingPageLazy,
  EntityAnalyticsUpsellingSectionLazy,
  OsqueryResponseActionsUpsellingSectionLazy,
  ThreatIntelligencePaywallLazy,
} from './lazy_upselling';
import * as i18n from './translations';
import { IntegrationsAssistantLazy } from './sections/integration_assistant';

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

// Upselling for entire pages, linked to a SecurityPageName
export const upsellingPages: UpsellingPages = [
  // It is highly advisable to make use of lazy loaded components to minimize bundle size.
  {
    pageName: SecurityPageName.entityAnalytics,
    pli: ProductFeatureKey.advancedInsights,
    component: () => (
      <EntityAnalyticsUpsellingPageLazy
        upgradeToLabel={entityAnalyticsProductType}
        upgradeMessage={i18n.UPGRADE_PRODUCT_MESSAGE(entityAnalyticsProductType)}
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
  {
    pageName: SecurityPageName.attackDiscovery,
    pli: ProductFeatureKey.attackDiscovery,
    component: () => <AttackDiscoveryUpsellingPageLazy />,
  },
];

const entityAnalyticsProductType = getProductTypeByPLI(ProductFeatureKey.advancedInsights) ?? '';

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
  {
    id: 'cloud_security_posture_integration_installation',
    pli: ProductFeatureKey.cloudSecurityPosture,
    component: CloudSecurityPostureIntegrationPliBlockLazy,
  },
  {
    id: 'entity_analytics_panel',
    pli: ProductFeatureKey.advancedInsights,
    component: () => (
      <EntityAnalyticsUpsellingSectionLazy
        upgradeToLabel={entityAnalyticsProductType}
        upgradeMessage={i18n.UPGRADE_PRODUCT_MESSAGE(entityAnalyticsProductType)}
      />
    ),
  },
  {
    id: 'integration_assistant',
    pli: ProductFeatureKey.integrationAssistant,
    component: () => (
      <IntegrationsAssistantLazy requiredPLI={ProductFeatureKey.integrationAssistant} />
    ),
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
  {
    id: 'investigation_guide_interactions',
    pli: ProductFeatureKey.investigationGuideInteractions,
    message: UPGRADE_INVESTIGATION_GUIDE_INTERACTIONS(
      getProductTypeByPLI(ProductFeatureKey.investigationGuideInteractions) ?? ''
    ),
  },
];
