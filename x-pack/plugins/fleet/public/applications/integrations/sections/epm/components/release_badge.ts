/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { RegistryRelease } from '../../../types';

export const RELEASE_BADGE_LABEL: { [key in Exclude<RegistryRelease, 'ga'>]: string } = {
  beta: i18n.translate('xpack.fleet.epm.releaseBadge.betaLabel', {
    defaultMessage: 'Beta',
  }),
  experimental: i18n.translate('xpack.fleet.epm.releaseBadge.experimentalLabel', {
    defaultMessage: 'Technical preview',
  }),
};

export const RELEASE_BADGE_DESCRIPTION: { [key in Exclude<RegistryRelease, 'ga'>]: string } = {
  beta: i18n.translate('xpack.fleet.epm.releaseBadge.betaDescription', {
    defaultMessage: 'This integration is not recommended for use in production environments.',
  }),
  experimental: i18n.translate('xpack.fleet.epm.releaseBadge.experimentalDescription', {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }),
};
