/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const RELATED_INTEGRATIONS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.fieldRelatedIntegrationsLabel',
  {
    defaultMessage: 'Related integrations',
  }
);

export const RELATED_INTEGRATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.relatedIntegrationAriaLabel',
  {
    defaultMessage: 'Related integration',
  }
);

export const RELATED_INTEGRATION_VERSION_DEPENDENCY_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.relatedIntegrationVersionDependencyAriaLabel',
  {
    defaultMessage: 'Related integration version dependency',
  }
);

export const RELATED_INTEGRATION_VERSION_DEPENDENCY_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.relatedIntegrationVersionDependencyPlaceholder',
  {
    defaultMessage: 'Semver dependency',
  }
);

export const REMOVE_RELATED_INTEGRATION_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.removeRelatedIntegrationButtonAriaLabel',
  {
    defaultMessage: 'Remove related integration',
  }
);

export const ADD_INTEGRATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.addIntegration',
  {
    defaultMessage: 'Add integration',
  }
);

export const INTEGRATION_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.integrationVersion',
  {
    defaultMessage: 'Version',
  }
);

export const INTEGRATION_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.validation.integrationRequired',
  {
    defaultMessage: 'Integration must be selected',
  }
);

export const VERSION_DEPENDENCY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.validation.versionRequired',
  {
    defaultMessage: 'Version dependency must be specified',
  }
);

export const VERSION_DEPENDENCY_INVALID = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDescription.relatedIntegrations.validation.versionInvalid',
  {
    defaultMessage:
      'Version dependency is not valid semver. Only tilde, caret or plain version supported e.g. ~1.2.3, ^1.2.3 or 1.2.3.',
  }
);
