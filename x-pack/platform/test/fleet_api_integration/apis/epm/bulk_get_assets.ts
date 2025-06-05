/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetBulkAssetsResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Bulk get assets', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('installs all assets when installing a package for the first time', () => {
      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage(pkgName, pkgVersion);
      });

      it('should get the assets based on the required objects', async () => {
        const packageInfo = await supertest
          .get(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
          .expect(200);
        const installationInfo = packageInfo.body.item.installationInfo;
        const { body }: { body: GetBulkAssetsResponse } = await supertest
          .post(`/api/fleet/epm/bulk_assets`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            assetIds: [...installationInfo.installed_es, ...installationInfo.installed_kibana],
          })
          .expect(200);

        // check overall list of assets and app links
        expectSnapshot(
          body.items.map((item) => ({
            type: item.type,
            id: item.id,
            appLink: item.appLink,
            attributes: item.attributes,
          }))
        ).toMatch();
      });
    });
  });
}
