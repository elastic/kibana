/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeCloudId } from '../../../../fleet/common';
import { CloudSetup } from '../../../../cloud/server';
import { UptimeConfig } from '../../config';
import { readEsHosts } from './read-es-url';

export function getDefaultESHosts({
  cloud,
  config,
}: {
  cloud?: CloudSetup;
  config: UptimeConfig;
}): string[] {
  const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
  const cloudUrl = cloudId && decodeCloudId(cloudId)?.elasticsearchUrl;
  const cloudHosts = cloudUrl ? [cloudUrl] : undefined;
  if (cloudHosts && cloudHosts.length > 0) {
    return cloudHosts;
  }

  const flagHosts = config?.unsafe?.service?.hosts;

  if (flagHosts && flagHosts.length > 0) {
    return flagHosts;
  }

  return [readEsHosts()];
}
