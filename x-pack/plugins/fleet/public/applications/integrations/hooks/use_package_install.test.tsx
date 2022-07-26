/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSetPackageInstallStatus, useGetPackageInstallStatus } from './use_package_install';

jest.mock('../../../hooks', () => ({
  sendInstallPackage: async () => ({}),
}));

describe('use_package_install', () => {
  test('should provide provide package installation status', async () => {
    const setPackageInstallStatus = useSetPackageInstallStatus();
    const getPackageInstallStatus = useGetPackageInstallStatus();
  });
});
