/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Installation } from '@kbn/fleet-plugin/server/types';
import expect from 'expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

const PARENT_PACKAGE = 'parent_with_dep';
const PARENT_WITH_DEP_ALT = 'parent_with_dep_alt';
const DEP_PACKAGE = 'dep_package';
const VERSION = '1.0.0';
const DEP_VERSION_NEWER = '2.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = (pkg: string, version: string, opts?: { force?: boolean }) =>
    supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: !!opts?.force });

  const getInstallationSavedObject = async (pkg: string): Promise<Installation | undefined> => {
    try {
      const res: { _source?: { 'epm-packages': Installation }; found?: boolean } =
        await es.transport.request({
          method: 'GET',
          path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/epm-packages:${pkg}`,
        });
      if (!res?.found) return undefined;
      return res?._source?.['epm-packages'] as Installation;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'meta' in err) {
        const meta = (err as { meta?: { statusCode?: number } }).meta;
        if (meta?.statusCode === 404) return undefined;
      }
      throw err;
    }
  };

  const installationExists = async (pkg: string): Promise<boolean> => {
    try {
      await es.transport.request({
        method: 'GET',
        path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/epm-packages:${pkg}`,
      });
      return true;
    } catch (err: any) {
      if (err?.meta?.statusCode === 404) return false;
      throw err;
    }
  };

  describe('Install package with dependencies (requires.content)', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    afterEach(async () => {
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
      await uninstallPackage(PARENT_PACKAGE, VERSION);
      await uninstallPackage(PARENT_WITH_DEP_ALT, VERSION);
      await uninstallPackage(DEP_PACKAGE, VERSION);
      await uninstallPackage(DEP_PACKAGE, DEP_VERSION_NEWER);
    });

    it('installs parent package and resolves then installs dependency', async () => {
      await installPackage(PARENT_PACKAGE, VERSION).expect(200);

      const depInstallation = await getInstallationSavedObject(DEP_PACKAGE);
      expect(depInstallation).toBeDefined();
      expect(depInstallation?.name).toBe(DEP_PACKAGE);
      expect(depInstallation?.version).toBe(VERSION);
      expect(depInstallation?.is_dependency_of).toEqual([
        { name: PARENT_PACKAGE, version: VERSION },
      ]);

      const parentInstallation = await getInstallationSavedObject(PARENT_PACKAGE);
      expect(parentInstallation).toBeDefined();
      expect(parentInstallation?.name).toBe(PARENT_PACKAGE);
      expect(parentInstallation?.dependencies).toEqual([{ name: DEP_PACKAGE, version: VERSION }]);
    });

    it('does not install package when a newer incompatible version of the dependency is already installed', async () => {
      await installPackage(DEP_PACKAGE, DEP_VERSION_NEWER).expect(200);

      const parentInstallResult = await installPackage(PARENT_PACKAGE, VERSION);
      expect(parentInstallResult.status).toBe(400);
      const body = parentInstallResult.body as { message?: string; error?: string };
      const message =
        typeof body === 'object' && body !== null ? body.message ?? body.error ?? '' : String(body);
      expect(message).toMatch(
        /not compatible with installed version|downgrade|PackageDependencyError/
      );

      const parentInstallation = await getInstallationSavedObject(PARENT_PACKAGE);
      expect(parentInstallation).toBeUndefined();

      const depInstallation = await getInstallationSavedObject(DEP_PACKAGE);
      expect(depInstallation?.version).toBe(DEP_VERSION_NEWER);
    });

    it('cleans up dependency package when parent is uninstalled', async () => {
      await installPackage(PARENT_PACKAGE, VERSION).expect(200);

      expect(await installationExists(DEP_PACKAGE)).toBe(true);
      expect(await installationExists(PARENT_PACKAGE)).toBe(true);

      const uninstallRes = await supertest
        .delete(`/api/fleet/epm/packages/${PARENT_PACKAGE}/${VERSION}`)
        .set('kbn-xsrf', 'xxxx');
      expect(uninstallRes.status).toBe(200);

      expect(await installationExists(PARENT_PACKAGE)).toBe(false);
      expect(await installationExists(DEP_PACKAGE)).toBe(false);
    });

    it('serializes two installs with dependencies via lock (both succeed, no concurrent dependency resolution)', async () => {
      await uninstallPackage(PARENT_PACKAGE, VERSION);
      await uninstallPackage(PARENT_WITH_DEP_ALT, VERSION);
      await uninstallPackage(DEP_PACKAGE, VERSION);

      const [res1, res2] = await Promise.all([
        installPackage(PARENT_PACKAGE, VERSION),
        installPackage(PARENT_WITH_DEP_ALT, VERSION),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      expect(await installationExists(DEP_PACKAGE)).toBe(true);
      expect(await installationExists(PARENT_PACKAGE)).toBe(true);
      expect(await installationExists(PARENT_WITH_DEP_ALT)).toBe(true);

      const depInstallation = await getInstallationSavedObject(DEP_PACKAGE);
      expect(depInstallation?.version).toBe(VERSION);
    });
  });
}
