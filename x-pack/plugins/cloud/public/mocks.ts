/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function createSetupMock() {
  return {
    cloudId: 'mock-cloud-id',
    isCloudEnabled: true,
    resetPasswordUrl: 'reset-password-url',
    accountUrl: 'account-url',
  };
}

export const cloudMock = {
  createSetup: createSetupMock,
};
