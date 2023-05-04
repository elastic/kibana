/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/public';

import { decodeCloudId } from '../decode_cloud_id/decode_cloud_id';

export function getCloudEnterpriseSearchHost(cloud: CloudSetup | undefined): string | undefined {
  if (cloud && cloud.isCloudEnabled && cloud.cloudId) {
    const deploymentId = getDeploymentId(cloud.cloudId);
    const res = decodeCloudId(cloud.cloudId);
    if (!(deploymentId && res)) {
      return;
    }

    // Enterprise Search Server url are formed like this `https://<deploymentId>.ent.<host>
    return `https://${deploymentId}.ent.${res.host}${
      res.defaultPort !== '443' ? `:${res.defaultPort}` : ''
    }`;
  }
}

function getDeploymentId(cloudId: string): string | undefined {
  const [deploymentId, rest] = cloudId.split(':');

  if (deploymentId && rest) {
    return deploymentId;
  }
}
