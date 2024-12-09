/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface ConnectorFeatureConfig {
  /**
   * Unique identifier for this feature.
   */
  id: string;

  /**
   * Display name for this feature.
   * This will be displayed to end-users, so a translatable string is advised for i18n.
   */
  name: string;
  compatibility: string;
}

export const AlertingConnectorFeatureId = 'alerting';
export const CasesConnectorFeatureId = 'cases';
export const UptimeConnectorFeatureId = 'uptime';
export const SecurityConnectorFeatureId = 'siem';
export const GenerativeAIForSecurityConnectorFeatureId = 'generativeAIForSecurity';
export const GenerativeAIForObservabilityConnectorFeatureId = 'generativeAIForObservability';
export const GenerativeAIForSearchPlaygroundConnectorFeatureId = 'generativeAIForSearchPlayground';
export const EdrForSecurityConnectorFeatureId = 'edrForSecurity';

const compatibilityEdrForSecurity = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.edrForSecurity',
  {
    defaultMessage: 'EDR for Security',
  }
);

const compatibilityGenerativeAIForSecurity = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.generativeAIForSecurity',
  {
    defaultMessage: 'Generative AI for Security',
  }
);

const compatibilityGenerativeAIForObservability = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.generativeAIForObservability',
  {
    defaultMessage: 'Generative AI for Observability',
  }
);

const compatibilityGenerativeAIForSearchPlayground = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.generativeAIForSearchPlayground',
  {
    defaultMessage: 'Generative AI for Search',
  }
);

const compatibilityAlertingRules = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.alertingRules',
  {
    defaultMessage: 'Alerting Rules',
  }
);
const compatibilitySecuritySolution = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.securitySolution',
  {
    defaultMessage: 'Security Solution',
  }
);

const compatibilityCases = i18n.translate(
  'xpack.actions.availableConnectorFeatures.compatibility.cases',
  {
    defaultMessage: 'Cases',
  }
);

export const AlertingConnectorFeature: ConnectorFeatureConfig = {
  id: AlertingConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.alerting', {
    defaultMessage: 'Alerting',
  }),
  compatibility: compatibilityAlertingRules,
};

export const CasesConnectorFeature: ConnectorFeatureConfig = {
  id: CasesConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.cases', {
    defaultMessage: 'Cases',
  }),
  compatibility: compatibilityCases,
};

export const UptimeConnectorFeature: ConnectorFeatureConfig = {
  id: UptimeConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.uptime', {
    defaultMessage: 'Uptime',
  }),
  compatibility: compatibilityAlertingRules,
};

export const SecuritySolutionFeature: ConnectorFeatureConfig = {
  id: SecurityConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.securitySolution', {
    defaultMessage: 'Security Solution',
  }),
  compatibility: compatibilitySecuritySolution,
};

export const GenerativeAIForSecurityFeature: ConnectorFeatureConfig = {
  id: GenerativeAIForSecurityConnectorFeatureId,
  name: compatibilityGenerativeAIForSecurity,
  compatibility: compatibilityGenerativeAIForSecurity,
};

export const GenerativeAIForObservabilityFeature: ConnectorFeatureConfig = {
  id: GenerativeAIForObservabilityConnectorFeatureId,
  name: compatibilityGenerativeAIForObservability,
  compatibility: compatibilityGenerativeAIForObservability,
};

export const GenerativeAIForSearchPlaygroundFeature: ConnectorFeatureConfig = {
  id: GenerativeAIForSearchPlaygroundConnectorFeatureId,
  name: compatibilityGenerativeAIForSearchPlayground,
  compatibility: compatibilityGenerativeAIForSearchPlayground,
};

export const EdrForSecurityFeature: ConnectorFeatureConfig = {
  id: EdrForSecurityConnectorFeatureId,
  name: compatibilityEdrForSecurity,
  compatibility: compatibilityEdrForSecurity,
};

const AllAvailableConnectorFeatures = {
  [AlertingConnectorFeature.id]: AlertingConnectorFeature,
  [CasesConnectorFeature.id]: CasesConnectorFeature,
  [UptimeConnectorFeature.id]: UptimeConnectorFeature,
  [SecuritySolutionFeature.id]: SecuritySolutionFeature,
  [GenerativeAIForSecurityFeature.id]: GenerativeAIForSecurityFeature,
  [GenerativeAIForObservabilityFeature.id]: GenerativeAIForObservabilityFeature,
  [GenerativeAIForSearchPlaygroundFeature.id]: GenerativeAIForSearchPlaygroundFeature,
  [EdrForSecurityFeature.id]: EdrForSecurityFeature,
};

export function areValidFeatures(ids: string[]) {
  return ids.every((id: string) => !!AllAvailableConnectorFeatures[id]);
}

export function getConnectorFeatureName(id: string) {
  const featureConfig = AllAvailableConnectorFeatures[id];
  return featureConfig ? featureConfig.name : id;
}

export function getConnectorCompatibility(featureIds?: string[]): string[] {
  const compatibility = new Set<string>();

  if (featureIds && featureIds.length > 0) {
    for (const featureId of featureIds) {
      if (AllAvailableConnectorFeatures[featureId]) {
        compatibility.add(AllAvailableConnectorFeatures[featureId].compatibility);
      }
    }
  }

  return Array.from(compatibility);
}
