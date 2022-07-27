/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

export const getCloud = ({ isCloudEnabled }: { isCloudEnabled: boolean }) => {
  const cloud: CloudSetup = {
    isCloudEnabled,
    baseUrl: 'https://base.url',
    cloudId: isCloudEnabled ? 'cloud-id' : undefined,
    cname: 'found.io',
    deploymentUrl: isCloudEnabled ? 'https://deployment.url' : undefined,
    organizationUrl: 'https://organization.url',
    profileUrl: 'https://profile.url',
    snapshotsUrl: 'https://snapshots.url',
  };

  return cloud;
};
