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
