/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { safeLoad } from 'js-yaml';
import { appContextService, licenseService } from '../../';

function loadSpec() {
  const xpackRootPath = path.join(__dirname, '../../../../../../..');
  const openApiPath = path.join(
    xpackRootPath,
    'node_modules/@elastic/package-registry/openapi.yml'
  );
  const yamlString = readFileSync(openApiPath, 'utf-8');
  const parsedSpec = safeLoad(yamlString);
  return parsedSpec;
}

// https://swagger.io/specification/#server-object
interface OASServerObject {
  url: string;
  description?: string;
}
// this works "for now" but not by design/contract
// description can be emtpy, duplicated, and contain CommonMark markup
// it's also possible that the registry could add a key like `x-server-id` to each server entry
const getServer = (key: string) => {
  const servers: OASServerObject[] = loadSpec()?.servers;
  const server = servers.find((o: OASServerObject) => o.description === key);
  return server;
};

const DEFAULT_REGISTRY_URL = getServer('public')?.url || 'https://epr.elastic.co';

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
