/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function createSetupMock() {
  return {
    cloudId: 'mock-cloud-id',
    isCloudEnabled: true,
    cname: 'cname',
    baseUrl: 'base-url',
    deploymentUrl: 'deployment-url',
    profileUrl: 'profile-url',
    organizationUrl: 'organization-url',
  };
}

export const cloudMock = {
  createSetup: createSetupMock,
};
