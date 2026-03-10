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
const DEP_PACKAGE = 'dep_package';
const VERSION = '1.0.0';

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
    const res: { _source?: { 'epm-packages': Installation } } = await es.transport.request({
      method: 'GET',
      path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/epm-packages:${pkg}`,
    });
    return res?._source?.['epm-packages'] as Installation;
  };

  describe('Install package with dependencies (requires.content)', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    after(async () => {
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
      await uninstallPackage(PARENT_PACKAGE, VERSION);
      await uninstallPackage(DEP_PACKAGE, VERSION);
    });

    it('installs parent package and resolves then installs dependency', async () => {
      await installPackage(PARENT_PACKAGE, VERSION).expect(200);

      const depInstallation = await getInstallationSavedObject(DEP_PACKAGE);
      expect(depInstallation).toBeDefined();
      expect(depInstallation?.name).toBe(DEP_PACKAGE);
      expect(depInstallation?.version).toBe(VERSION);
      expect(depInstallation?.is_dependency).toBe(true);

      const parentInstallation = await getInstallationSavedObject(PARENT_PACKAGE);
      expect(parentInstallation).toBeDefined();
      expect(parentInstallation?.name).toBe(PARENT_PACKAGE);
      expect(parentInstallation?.dependencies).toEqual([{ name: DEP_PACKAGE, version: VERSION }]);
    });
  });
}
