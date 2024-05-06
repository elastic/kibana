/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INTEGRATIONS_INSTALLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.installedTitle',
  {
    defaultMessage: 'Installed',
  }
);

export const INTEGRATIONS_INSTALLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.installedTooltip',
  {
    defaultMessage:
      'Integration is installed. Configure an integration policy and ensure Elastic Agents are assigned this policy to ingest compatible events.',
  }
);

export const INTEGRATIONS_UNINSTALLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.uninstalledTitle',
  {
    defaultMessage: 'Not installed',
  }
);

export const INTEGRATIONS_UNINSTALLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.uninstalledTooltip',
  {
    defaultMessage:
      'Integration is not installed. Follow the integration link to install and configure the integration.',
  }
);

export const INTEGRATIONS_ENABLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.enabledTitle',
  {
    defaultMessage: 'Installed: enabled',
  }
);

export const INTEGRATIONS_ENABLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.enabledTooltip',
  {
    defaultMessage:
      'Integration is installed and an integration policy with the required configuration exists. Ensure Elastic Agents are assigned this policy to ingest compatible events.',
  }
);

export const INTEGRATIONS_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.badgeTitle',
  {
    defaultMessage: 'integrations',
  }
);

export const INTEGRATIONS_POPOVER_TITLE = (integrationsCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.relatedIntegrations.popoverTitle', {
    values: { integrationsCount },
    defaultMessage:
      '[{integrationsCount}] Related {integrationsCount, plural, =1 {integration} other {integrations}} available',
  });

export const INTEGRATIONS_POPOVER_DESCRIPTION = (integrationsCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.relatedIntegrations.popoverDescription', {
    values: { integrationsCount },
    defaultMessage:
      'Install and configure {integrationsCount, plural, =1 {the below integration} other {one or more of the below integrations}} to ingest the necessary data for this detection rule:',
  });

export const INTEGRATIONS_INSTALLED_VERSION_TOOLTIP = (
  installedVersion: string,
  requiredVersion: string
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.relatedIntegrations.popoverDescriptionInstalledVersionTooltip',
    {
      values: { installedVersion, requiredVersion },
      defaultMessage:
        'Version mismatch -- please resolve! Installed version `{installedVersion}` when required version `{requiredVersion}`',
    }
  );
