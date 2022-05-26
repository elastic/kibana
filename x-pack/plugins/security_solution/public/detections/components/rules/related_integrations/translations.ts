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

export const INTEGRATIONS_UNINSTALLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.uninstalledTitle',
  {
    defaultMessage: 'Uninstalled',
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

export const INTEGRATIONS_POPOVER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.relatedIntegrations.popoverDescription',
  {
    defaultMessage:
      'Install and configure the below integrations to ingest the necessary data for this detection rule:',
  }
);

export const INTEGRATIONS_INSTALLED_VERSION_TOOLTIP = (
  installedVersion: string,
  targetVersion: string
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.relatedIntegrations.popoverDescriptionInstalledVersionTooltip',
    {
      values: { installedVersion, targetVersion },
      defaultMessage:
        'Version mismatch -- please resolve! Installed version `{installedVersion}` when target version `{targetVersion}`',
    }
  );

export const INTEGRATIONS_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.relatedIntegrations.fetchFailDescription',
  {
    defaultMessage: 'Failed to fetch installed integrations',
  }
);
