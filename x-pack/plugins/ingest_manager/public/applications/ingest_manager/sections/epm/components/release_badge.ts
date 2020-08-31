/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { RegistryRelease } from '../../../types';

export const RELEASE_BADGE_LABEL: { [key in Exclude<RegistryRelease, 'ga'>]: string } = {
  beta: i18n.translate('xpack.ingestManager.epm.releaseBadge.betaLabel', {
    defaultMessage: 'Beta',
  }),
  experimental: i18n.translate('xpack.ingestManager.epm.releaseBadge.experimentalLabel', {
    defaultMessage: 'Experimental',
  }),
};

export const RELEASE_BADGE_DESCRIPTION: { [key in Exclude<RegistryRelease, 'ga'>]: string } = {
  beta: i18n.translate('xpack.ingestManager.epm.releaseBadge.betaDescription', {
    defaultMessage: 'This integration is not recommended for use in production environments.',
  }),
  experimental: i18n.translate('xpack.ingestManager.epm.releaseBadge.experimentalDescription', {
    defaultMessage: 'This integration may have breaking changes or be removed in a future release.',
  }),
};
