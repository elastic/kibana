/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

export function getCloudEnterpriseSearchHost(cloud: CloudSetup | undefined): string | undefined {
  if (cloud && cloud.isCloudEnabled && cloud.cloudId && cloud.deploymentId && cloud.cloudHost) {
    // Enterprise Search Server url are formed like this `https://<deploymentId>.ent.<host>
    return `https://${cloud.deploymentId}.ent.${cloud.cloudHost}${
      cloud.cloudDefaultPort && cloud.cloudDefaultPort !== '443' ? `:${cloud.cloudDefaultPort}` : ''
    }`;
  }
}
