/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { bundlePackage, removeBundledPackages } from './install_bundled';

export default function (providerContext: FtrProviderContext) {
  /**
   * There are a few features that are only currently supported for the Endpoint
   * package due to security concerns.
   */
  describe('Install endpoint package', () => {
    const { getService } = providerContext;
    skipIfNoDockerRegistry(providerContext);

    const supertest = getService('supertest');
    const es = getService('es');
    const log = getService('log');
    const fleetAndAgents = getService('fleetAndAgents');
    const pkgName = 'endpoint';
    const pkgVersion = '8.6.1';

    const transforms = [
      {
        id: 'endpoint.metadata_current-default',
        dest: 'metrics-endpoint.metadata_current_default',
      },
      {
        id: 'endpoint.metadata_united-default',
        dest: '.metrics-endpoint.metadata_united_default',
      },
    ];

    const installPackage = async (name: string, version: string) => {
      await supertest
        .post(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    };

    before(async () => {
      await fleetAndAgents.setup();
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
      await bundlePackage('endpoint-8.6.1');
      await installPackage('endpoint', '8.6.1');
    });
    after(async () => {
      await uninstallPackage('endpoint', '8.6.1');
      await removeBundledPackages(log);
    });

    describe('install', () => {
      transforms.forEach((transform) => {
        it(`should have installed the [${transform.id}] transform`, async function () {
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/_transform/${transform.id}-${pkgVersion}`,
            },
            { meta: true }
          );
          expect(res.statusCode).equal(200);
        });
        it(`should have created the destination index for the [${transform.id}] transform`, async function () {
          // the  index is defined in the transform file
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/${transform.dest}`,
            },
            { meta: true }
          );
          expect(res.statusCode).equal(200);
        });
      });
    });

    describe('same-version reinstall keeps transform refs in installed_es', () => {
      // Regression test for elastic/kibana#217503: force-reinstalling the same package version
      // produced transform ids byte-identical to the previous refs. The legacy install path
      // applied removals in a separate SO write after the add, wiping the freshly-written refs
      // and leaving installed_es with zero transform entries while ES still had live transforms.
      // On the next upgrade nothing was deleted and duplicate transforms accumulated.
      after(async () => {
        // Endpoint uninstall is unreliable (the suite below is skipped). Delete any transforms
        // this describe block may have left behind so a dirty environment from a prior failed run
        // does not cause spurious failures in subsequent runs.
        await es.transport.request(
          { method: 'DELETE', path: '/_transform/endpoint.metadata_*?force=true' },
          { meta: true, ignore: [404] }
        );
      });
      it('transform refs and ES transforms must match expected ids after same-version force reinstall', async function () {
        const expectedIds = transforms.map((t) => `${t.id}-${pkgVersion}`);

        await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);

        // SO refs must still list every expected transform id.
        const pkgRes = await supertest
          .get(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const installedEs: Array<{ id: string; type: string }> =
          pkgRes.body.item.installationInfo.installed_es;
        const transformRefIds = installedEs.filter((a) => a.type === 'transform').map((a) => a.id);

        for (const expectedId of expectedIds) {
          expect(transformRefIds).to.contain(expectedId);
        }

        // ES must contain exactly the expected transform ids — no extras, no old versions.
        // Not passing ignore:[404] so the request throws if transforms are unexpectedly absent,
        // rather than silently returning a 404 that would make the statusCode check fail cryptically.
        const esRes = (await es.transport.request(
          { method: 'GET', path: `/_transform/endpoint.metadata_*` },
          { meta: true }
        )) as { statusCode: number; body: { transforms: Array<{ id: string }> } };
        expect(esRes.statusCode).equal(200);
        const esIds = esRes.body.transforms.map((t) => t.id).sort();

        expect(esIds).to.eql([...expectedIds].sort());
      });
    });

    const uninstallPackage = async (pkg: string, version: string) =>
      supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');

    // Endpoint doesn't currently support uninstalls
    describe.skip('uninstall', () => {
      before(async () => {
        await uninstallPackage(pkgName, pkgVersion);
      });

      transforms.forEach((transform) => {
        it(`should have uninstalled the [${transform.id}] transforms`, async function () {
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/_transform/${transform.id}`,
            },
            { meta: true, ignore: [404] }
          );
          expect(res.statusCode).equal(404);
        });

        it(`should have deleted the index for the [${transform.id}] transform`, async function () {
          // the  index is defined in the transform file
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/${transform.dest}`,
            },
            {
              meta: true,
              ignore: [404],
            }
          );
          expect(res.statusCode).equal(404);
        });
      });
    });
  });
}
