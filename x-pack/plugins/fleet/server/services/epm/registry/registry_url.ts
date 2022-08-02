/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../..';

// from https://github.com/elastic/package-registry#docker (maybe from OpenAPI one day)
// the unused variables cause a TS warning about unused values
// chose to comment them out vs @ts-ignore or @ts-expect-error on each line

const PRODUCTION_REGISTRY_URL_CDN = 'https://epr.elastic.co';
const STAGING_REGISTRY_URL_CDN = 'https://epr-staging.elastic.co';
const SNAPSHOT_REGISTRY_URL_CDN = 'https://epr-snapshot.elastic.co';

// const PRODUCTION_REGISTRY_URL_NO_CDN = 'https://epr.ea-web.elastic.dev';
// const STAGING_REGISTRY_URL_NO_CDN = 'https://epr-staging.ea-web.elastic.dev';
// const SNAPSHOT_REGISTRY_URL_NO_CDN = 'https://epr-snapshot.ea-web.elastic.dev';

const getDefaultRegistryUrl = (): string => {
  const branch = appContextService.getKibanaBranch();
  if (branch === 'main') {
    return SNAPSHOT_REGISTRY_URL_CDN;
  } else if (appContextService.getKibanaVersion().includes('-SNAPSHOT')) {
    return STAGING_REGISTRY_URL_CDN;
  } else {
    return PRODUCTION_REGISTRY_URL_CDN;
  }
};

export const getRegistryUrl = (): string => {
  const customUrl = appContextService.getConfig()?.registryUrl;

  if (customUrl) {
    return customUrl;
  }

  return getDefaultRegistryUrl();
};
