/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { ServiceConfig } from '../../common/config';

export function getEsHosts({
  cloud,
  config,
}: {
  cloud?: CloudSetup;
  config: ServiceConfig;
}): string[] {
  const cloudUrl = cloud?.isCloudEnabled && cloud?.elasticsearchUrl;
  const cloudHosts = cloudUrl ? [cloudUrl] : undefined;
  if (cloudHosts && cloudHosts.length > 0) {
    return cloudHosts;
  }

  const flagHosts = config.hosts;

  if (flagHosts && flagHosts.length > 0) {
    return flagHosts;
  }

  return [];
}
