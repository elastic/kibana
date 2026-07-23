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

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';

const DEPRECATED_PACKAGES = [
  'zscaler', // deprecated: https://github.com/elastic/integrations/issues/4947
  'symantec',
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const logger = getService('log');
  const API_VERSION = '2023-10-31';
  const API_VERSION_HEADER_NAME = 'elastic-api-version';

  function isTransientError(error: any): boolean {
    const status = error?.response?.status ?? error?.status;
    if (status != null) {
      return status >= 500;
    }
    // Network-level errors (ECONNRESET, ETIMEDOUT, etc.)
    return error?.code != null;
  }

  async function installPackage(
    name: string,
    version: string,
    maxRetries = 3
  ): Promise<{ name: string; version: string; success: boolean; error?: any; took?: number }> {
    const start = Date.now();
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await supertest
          .post(`/api/fleet/epm/packages/${name}/${version}`)
          .set('kbn-xsrf', 'xxx')
          .set(API_VERSION_HEADER_NAME, API_VERSION)
          .send({ force: true })
          .expect(200);
        return { name, version, success: true, took: (Date.now() - start) / 1000 };
      } catch (error) {
        lastError = error;
        if (!isTransientError(error) || attempt === maxRetries) {
          break;
        }
        const delayMs = 2000 * attempt;
        logger.warning(
          `Install ${name}@${version} failed with transient error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms: ${error?.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return { name, version, success: false, error: lastError };
  }

  async function deletePackage(
    name: string,
    version: string
  ): Promise<{ name: string; success: boolean; error?: any }> {
    return supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxx')
      .set(API_VERSION_HEADER_NAME, API_VERSION)
      .expect(200)
      .then(() => {
        return { name, success: true };
      })
      .catch((error) => {
        return { name, success: false, error };
      });
  }

  describe('install all fleet packages', function () {
    this.timeout(1000 * 60 * 60); // 1 hour
    it('should work and install all packages', async () => {
      const {
        body: { items: packages },
      } = await supertest
        .get('/api/fleet/epm/packages?prerelease=true')
        .set(API_VERSION_HEADER_NAME, API_VERSION)
        .expect(200);
      const allResults = [];
      for (const pkg of packages) {
        // skip deprecated failing packages
        if (DEPRECATED_PACKAGES.includes(pkg.name)) continue;

        const res = await installPackage(pkg.name, pkg.version);
        allResults.push(res);
        if (res.success) {
          await deletePackage(pkg.name, pkg.version);
        }
      }
      const succeededInstall = allResults
        .filter((res) => res.success === true)
        .sort((a, b) => (b.took ?? 0) - (a.took ?? 0));
      succeededInstall.forEach((res) => {
        const pkgName = `${res.name}@${res.version}`;
        if (!res.success) {
          logger.info(`❌ ${pkgName} failed: ${res?.error?.message}`);
        } else {
          logger.info(`✅ ${pkgName} took ${res.took}s`);
        }
      });
      const failedInstall = allResults.filter((res) => res.success === false);
      if (failedInstall.length) {
        throw new Error(
          `Some package install failed: ${failedInstall
            .map((res) => `${res.name}@${res.version}`)
            .join(', ')}`
        );
      }
    });
  });
}
