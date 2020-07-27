/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_REGISTRY_URL } from '../../../constants';
import { appContextService, licenseService } from '../../';

export const getRegistryUrl = (): string => {
  const license = licenseService.getLicenseInformation();
  const customUrl = appContextService.getConfig()?.registryUrl;

  if (
    customUrl &&
    license &&
    license.isAvailable &&
    license.hasAtLeast('gold') &&
    license.isActive
  ) {
    return customUrl;
  }

  if (customUrl) {
    appContextService.getLogger().warn('Gold license is required to use a custom registry url.');
  }

  return DEFAULT_REGISTRY_URL;
};
