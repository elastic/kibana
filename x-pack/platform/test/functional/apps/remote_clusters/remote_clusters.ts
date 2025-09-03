/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const deployment = getService('deployment');
  const pageObjects = getPageObjects(['common', 'remoteClusters']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  const REMOTE_CLUSTER_NAME = 'testName';
  const HOST_PORT = 'test:9400';

  describe('remote clusters', () => {
    let isCloud: boolean;
    before(async () => {
      isCloud = await deployment.isCloud();
      await security.testUser.setRoles(['global_ccr_role']);
      await pageObjects.common.navigateToApp('remoteClusters');
      await pageObjects.remoteClusters.createNewRemoteCluster(
        REMOTE_CLUSTER_NAME,
        HOST_PORT,
        isCloud
      );
    });

    after(async () => {
      await es.cluster.putSettings({
        persistent: {
          cluster: {
            remote: {
              [REMOTE_CLUSTER_NAME]: {
                mode: null,
                skip_unavailable: null,
                node_connections: null,
                seeds: null,
                server_name: null,
                proxy_socket_connections: null,
                proxy_address: null,
              },
            },
          },
        },
      });
    });

    it('should add a remote cluster', async () => {
      expect(await testSubjects.exists('remoteClusterDetailsFlyoutTitle')).to.be(true);
      expect(await testSubjects.getVisibleText('remoteClusterDetailsFlyoutTitle')).to.be(
        REMOTE_CLUSTER_NAME
      );

      const hostFieldId = isCloud ? 'remoteClusterDetailProxyAddress' : 'remoteClusterDetailSeeds';
      expect(await testSubjects.exists(hostFieldId)).to.be(true);
      expect(await testSubjects.getVisibleText(hostFieldId)).to.be(HOST_PORT);
    });
  });
}
