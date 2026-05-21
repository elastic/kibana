/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const supertest = getService('supertest');

  const PARENT_PKG = 'parent_with_dep';
  const PARENT_PKG_ALT = 'parent_with_dep_alt';
  const DEP_PKG = 'dep_package';

  async function installPackage(pkgName: string, pkgVersion: string) {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  }

  async function deletePackageSafe(pkgName: string, pkgVersion: string) {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx');
  }

  async function assertInstalledVersion(pkgName: string, expectedVersion: string) {
    const so = await kibanaServer.savedObjects.get({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: pkgName,
    });
    expect(so.attributes.version).to.equal(expectedVersion);
  }

  async function assertNotInstalled(pkgName: string) {
    let found = false;
    try {
      await kibanaServer.savedObjects.get({ type: PACKAGES_SAVED_OBJECT_TYPE, id: pkgName });
      found = true;
    } catch {
      // 404 means the package was successfully uninstalled
    }
    expect(found).to.be(false);
  }

  async function rollbackPackage(pkgName: string) {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/rollback`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  }

  describe('Composable package dependency rollback', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('upgrade adds a new dependency', () => {
      // parent_with_dep 0.1.0 has no deps; 1.0.0 adds dep_package@1.0.0
      afterEach(async () => {
        await deletePackageSafe(PARENT_PKG, '1.0.0');
        await deletePackageSafe(PARENT_PKG, '0.1.0');
        await deletePackageSafe(DEP_PKG, '1.0.0');
      });

      it('removes the freshly-installed dependency on rollback', async () => {
        await installPackage(PARENT_PKG, '0.1.0');
        await installPackage(PARENT_PKG, '1.0.0');

        // dep_package should have been installed by step_resolve_dependencies
        await assertInstalledVersion(DEP_PKG, '1.0.0');

        // previous_dependency_versions should record dep as freshly installed (null = no prior version)
        const pkgSO = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: PARENT_PKG,
        });
        expect(pkgSO.attributes.previous_dependency_versions).to.eql([
          { name: DEP_PKG, previous_version: null },
        ]);

        await rollbackPackage(PARENT_PKG);

        await assertInstalledVersion(PARENT_PKG, '0.1.0');
        // dep_package must have been removed since it was freshly installed by this upgrade
        await assertNotInstalled(DEP_PKG);
      });
    });

    describe('upgrade upgrades a dependency', () => {
      // parent_with_dep 1.0.0 requires dep@1.0.0; 2.0.0 requires dep@^2.0.0
      afterEach(async () => {
        await deletePackageSafe(PARENT_PKG, '2.0.0');
        await deletePackageSafe(PARENT_PKG, '1.0.0');
        await deletePackageSafe(DEP_PKG, '2.0.0');
        await deletePackageSafe(DEP_PKG, '1.0.0');
      });

      it('rolls back the dependency to its previous version on rollback', async () => {
        await installPackage(PARENT_PKG, '1.0.0');
        await assertInstalledVersion(DEP_PKG, '1.0.0');

        await installPackage(PARENT_PKG, '2.0.0');
        await assertInstalledVersion(DEP_PKG, '2.0.0');

        // previous_dependency_versions should record the prior dep version
        const pkgSO = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: PARENT_PKG,
        });
        expect(pkgSO.attributes.previous_dependency_versions).to.eql([
          { name: DEP_PKG, previous_version: '1.0.0' },
        ]);

        await rollbackPackage(PARENT_PKG);

        await assertInstalledVersion(PARENT_PKG, '1.0.0');
        // dep_package should be rolled back to its previous version
        await assertInstalledVersion(DEP_PKG, '1.0.0');
      });
    });

    describe('two composable packages share a dependency', () => {
      // parent_with_dep_alt@1.0.0 installs dep first; parent_with_dep then upgrades
      // from 0.1.0 → 1.0.0 but dep is already installed so it is NOT in the delta
      afterEach(async () => {
        await deletePackageSafe(PARENT_PKG, '1.0.0');
        await deletePackageSafe(PARENT_PKG, '0.1.0');
        await deletePackageSafe(PARENT_PKG_ALT, '1.0.0');
        await deletePackageSafe(DEP_PKG, '1.0.0');
      });

      it('does not remove the shared dependency when rolling back one package', async () => {
        // parent_with_dep_alt installs dep_package@1.0.0
        await installPackage(PARENT_PKG_ALT, '1.0.0');
        await assertInstalledVersion(DEP_PKG, '1.0.0');

        // parent_with_dep upgrades 0.1.0 → 1.0.0; dep already satisfies the constraint,
        // so step_resolve_dependencies records it as 'installed' — NOT in previous_dependency_versions
        await installPackage(PARENT_PKG, '0.1.0');
        await installPackage(PARENT_PKG, '1.0.0');

        const pkgSO = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: PARENT_PKG,
        });
        expect(pkgSO.attributes.previous_dependency_versions ?? []).to.eql([]);

        // Rollback is available because there are no dep deltas to validate
        const checkRes = await supertest
          .get(`/internal/fleet/epm/packages/${PARENT_PKG}/rollback/available_check`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .expect(200);
        expect(checkRes.body.isAvailable).to.be(true);

        await rollbackPackage(PARENT_PKG);
        await assertInstalledVersion(PARENT_PKG, '0.1.0');

        // dep_package must still be installed — parent_with_dep_alt still depends on it
        await assertInstalledVersion(DEP_PKG, '1.0.0');
      });
    });
  });
}
