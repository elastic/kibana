/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

const PKG_NAME = 'all_assets';
const PKG_VERSION = '0.1.0';
// Archive ID of the tag SO embedded in all_assets 0.1.0 (kibana/tag/sample_tag.json)
const TAG_ARCHIVE_ID = 'sample_tag';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es: Client = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const installPackage = () =>
    supertest
      .post(`/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  const uninstallPackage = () =>
    supertest
      .delete(`/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  /**
   * Injects a tag SO directly into .kibana with originId = TAG_ARCHIVE_ID.
   * This simulates the orphaned copies left behind by failed install attempts: each
   * attempt allocates a new UUID for the tag, but if the install fails before the
   * refs are saved, that UUID is never tracked in installed_kibana.  Two such orphans
   * sharing the same originId trigger the ambiguous_conflict error on the next import.
   */
  const injectOrphanedTag = async (soId: string) => {
    await es.index({
      index: '.kibana',
      id: `tag:${soId}`,
      refresh: 'wait_for',
      document: {
        type: 'tag',
        tag: {
          name: `fleet-test-orphan-${soId}`,
          description: '',
          color: '#000000',
        },
        originId: TAG_ARCHIVE_ID,
        namespaces: ['default'],
        managed: false,
        references: [],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    });
  };

  const deleteOrphanedTag = async (soId: string) => {
    await es.delete({ index: '.kibana', id: `tag:${soId}`, refresh: 'wait_for' }).catch(() => {});
  };

  describe('Orphaned multiple-isolated SO cleanup during package install', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    afterEach(async () => {
      if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
      await uninstallPackage();
      await deleteOrphanedTag('fleet-orphan-test-1');
      await deleteOrphanedTag('fleet-orphan-test-2');
    });

    it('succeeds on a fresh install when two orphaned tag SOs from prior failed installs share the same originId', async () => {
      // Inject two orphaned copies of sample_tag (simulates two separate failed installs,
      // each of which allocated a new UUID before failing).  Without the fix these two
      // objects cause an ambiguous_conflict when the SO importer tries to resolve the
      // origin query ("tag:sample_tag" | "sample_tag") and finds two destinations.
      await injectOrphanedTag('fleet-orphan-test-1');
      await injectOrphanedTag('fleet-orphan-test-2');

      const response = await installPackage();
      expect(response.status).to.be(200);
    });

    it('removes injected orphan SOs during a successful install', async () => {
      await injectOrphanedTag('fleet-orphan-test-1');
      await injectOrphanedTag('fleet-orphan-test-2');

      await installPackage().expect(200);

      const orphan1Exists = await es
        .exists({ index: '.kibana', id: 'tag:fleet-orphan-test-1' })
        .catch(() => false);
      const orphan2Exists = await es
        .exists({ index: '.kibana', id: 'tag:fleet-orphan-test-2' })
        .catch(() => false);

      expect(orphan1Exists).to.be(false);
      expect(orphan2Exists).to.be(false);
    });

    it('succeeds on reinstall when an orphaned tag SO from a prior failed reinstall is present', async () => {
      // First install succeeds and tracks the tag in installed_kibana
      await installPackage().expect(200);

      // Inject a second copy of sample_tag (simulates a failed reinstall that allocated a
      // new UUID but did not finish saving refs).  This creates the ambiguous_conflict
      // condition: the importer finds both the tracked tag and the orphan.
      await injectOrphanedTag('fleet-orphan-test-1');

      const reinstallResponse = await installPackage();
      expect(reinstallResponse.status).to.be(200);
    });

    it('removes the orphaned SO left by a failed reinstall', async () => {
      await installPackage().expect(200);
      await injectOrphanedTag('fleet-orphan-test-1');

      await installPackage().expect(200);

      const orphanExists = await es
        .exists({ index: '.kibana', id: 'tag:fleet-orphan-test-1' })
        .catch(() => false);
      expect(orphanExists).to.be(false);
    });
  });
}
