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
// Archive ID of the dashboard SO embedded in all_assets 0.1.0 (kibana/dashboard/sample_dashboard.json)
const DASHBOARD_ARCHIVE_ID = 'sample_dashboard';
const TEST_SPACE = 'fleet-orphan-test-space';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es: Client = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  // Install in the given space (defaults to the default space).
  const installPackage = (spaceId?: string) =>
    supertest
      .post(
        spaceId
          ? `/s/${spaceId}/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`
          : `/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`
      )
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  // Uninstall always goes through the default-space endpoint — Fleet tracks packages
  // globally in the ingest index, so the space used for install doesn't matter here.
  const uninstallPackage = () =>
    supertest
      .delete(`/api/fleet/epm/packages/${PKG_NAME}/${PKG_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });

  const createSpace = (spaceId: string) =>
    supertest
      .post('/api/spaces/space')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: spaceId, id: spaceId, initials: 's', color: '#D6BF57', disabledFeatures: [] });

  const deleteSpace = (spaceId: string) =>
    supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx');

  /**
   * Injects a tag SO directly into .kibana with originId = TAG_ARCHIVE_ID.
   *
   * `tag` is a `multiple-isolated` type. Unlike single-namespace types whose ES _id is
   * prefixed with the namespace (`{space}:{type}:{id}`), multiple-isolated objects always
   * use `{type}:{id}` as the raw ES _id regardless of which space they belong to.  Space
   * membership is tracked exclusively via the `namespaces` array in the document body.
   *
   * Two orphans sharing the same originId trigger the ambiguous_conflict error on the
   * next import; the fix deletes them before the import runs.
   */
  const injectOrphanedTag = async (soId: string, spaceId = 'default') => {
    await es.index({
      index: '.kibana',
      // No namespace prefix — multiple-isolated types use 'tag:{id}' for all spaces.
      id: `tag:${soId}`,
      refresh: 'wait_for',
      document: {
        type: 'tag',
        tag: { name: `fleet-test-orphan-${soId}`, description: '', color: '#000000' },
        originId: TAG_ARCHIVE_ID,
        // Space membership for multiple-isolated types is encoded in the namespaces array.
        namespaces: [spaceId],
        managed: false,
        references: [],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    });
  };

  const deleteOrphanedTag = async (soId: string) => {
    await es
      .delete({ index: '.kibana', id: `tag:${soId}`, refresh: 'wait_for' })
      .catch((err: Error & { statusCode?: number }) => {
        if (err?.statusCode !== 404) throw err;
      });
  };

  const orphanExists = async (soId: string) => {
    return es.exists({ index: '.kibana', id: `tag:${soId}` }).catch(() => false);
  };

  /**
   * Injects a dashboard SO directly into .kibana_analytics with originId = DASHBOARD_ARCHIVE_ID.
   *
   * `dashboard` is also a `multiple-isolated` type (namespaceType: 'multiple-isolated'),
   * so its ES _id format is `dashboard:{uuid}` and space membership is tracked via the
   * `namespaces` array — identical to `tag`. Fleet rewrites dashboard ids to a v5 UUID
   * and sets `originId` to the archive id when installing into additional spaces, which
   * is the path most likely to produce orphans when an install fails mid-way.
   *
   * Note: dashboard SOs use `indexPattern: ANALYTICS_SAVED_OBJECT_INDEX`, so they live
   * in `.kibana_analytics`, not `.kibana`.
   */
  const injectOrphanedDashboard = async (soId: string, spaceId = 'default') => {
    await es.index({
      index: '.kibana_analytics',
      id: `dashboard:${soId}`,
      refresh: 'wait_for',
      document: {
        type: 'dashboard',
        dashboard: {
          title: `fleet-test-orphan-dashboard-${soId}`,
          description: 'Orphaned dashboard from a failed Fleet install',
          hits: 0,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          optionsJSON: '{}',
          panelsJSON: '[]',
          timeRestore: false,
          version: 1,
        },
        originId: DASHBOARD_ARCHIVE_ID,
        namespaces: [spaceId],
        managed: false,
        references: [],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    });
  };

  const deleteOrphanedDashboard = async (soId: string) => {
    await es
      .delete({ index: '.kibana_analytics', id: `dashboard:${soId}`, refresh: 'wait_for' })
      .catch((err: Error & { statusCode?: number }) => {
        if (err?.statusCode !== 404) throw err;
      });
  };

  const dashboardOrphanExists = async (soId: string) => {
    return es.exists({ index: '.kibana_analytics', id: `dashboard:${soId}` }).catch(() => false);
  };

  describe('Orphaned multiple-isolated SO cleanup during package install', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('in the default space', () => {
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

        expect(await orphanExists('fleet-orphan-test-1')).to.be(false);
        expect(await orphanExists('fleet-orphan-test-2')).to.be(false);
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

        expect(await orphanExists('fleet-orphan-test-1')).to.be(false);
      });
    });

    describe('in a non-default space', () => {
      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await createSpace(TEST_SPACE).expect(200);
      });

      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await deleteSpace(TEST_SPACE);
      });

      afterEach(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage();
        // Clean up all soIds used across these tests.
        await deleteOrphanedTag('fleet-orphan-space-1');
        await deleteOrphanedTag('fleet-orphan-space-2');
        // Used by the cross-space isolation test (lives in the default space).
        await deleteOrphanedTag('fleet-orphan-default-1');
      });

      it('succeeds on a fresh install when two orphaned tag SOs share the same originId in the target space', async () => {
        await injectOrphanedTag('fleet-orphan-space-1', TEST_SPACE);
        await injectOrphanedTag('fleet-orphan-space-2', TEST_SPACE);

        const response = await installPackage(TEST_SPACE);
        expect(response.status).to.be(200);
      });

      it('removes orphaned tag SOs scoped to the target space during install', async () => {
        await injectOrphanedTag('fleet-orphan-space-1', TEST_SPACE);
        await injectOrphanedTag('fleet-orphan-space-2', TEST_SPACE);

        await installPackage(TEST_SPACE).expect(200);

        expect(await orphanExists('fleet-orphan-space-1')).to.be(false);
        expect(await orphanExists('fleet-orphan-space-2')).to.be(false);
      });

      it('does not delete orphaned tag SOs that belong to a different space', async () => {
        // Inject an orphan in the DEFAULT space using a distinct soId so it can coexist
        // in .kibana alongside any TEST_SPACE orphans (multiple-isolated types share the
        // 'tag:{id}' _id format, so each orphan must have a unique soId).
        await injectOrphanedTag('fleet-orphan-default-1');

        // Install in TEST_SPACE — the cleanup must be scoped to TEST_SPACE only and must
        // not touch objects whose namespaces array contains only 'default'.
        await installPackage(TEST_SPACE).expect(200);

        // The default-space orphan must still be present.
        expect(await orphanExists('fleet-orphan-default-1')).to.be(true);
      });

      it('succeeds on reinstall when an orphaned tag SO from a prior failed reinstall is present in the space', async () => {
        await installPackage(TEST_SPACE).expect(200);
        await injectOrphanedTag('fleet-orphan-space-1', TEST_SPACE);

        const reinstallResponse = await installPackage(TEST_SPACE);
        expect(reinstallResponse.status).to.be(200);
      });

      it('removes the orphaned SO left by a failed reinstall in the space', async () => {
        await installPackage(TEST_SPACE).expect(200);
        await injectOrphanedTag('fleet-orphan-space-1', TEST_SPACE);

        await installPackage(TEST_SPACE).expect(200);

        expect(await orphanExists('fleet-orphan-space-1')).to.be(false);
      });
    });

    // Dashboard-specific tests: `dashboard` is a `multiple-isolated` type that Fleet
    // rewrites to UUID ids in additional spaces.  Before Fix 1 (issue #210141), dashboard
    // orphans were never cleaned up because `MULTIPLE_ISOLATED_KIBANA_SO_TYPES` excluded
    // `dashboard`.  These tests verify the cleanup now runs for dashboards too.
    describe('dashboard orphan cleanup (Fix 1 — issue #210141)', () => {
      const DASHBOARD_SPACE = 'fleet-orphan-dashboard-space';

      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await createSpace(DASHBOARD_SPACE).expect(200);
      });

      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await deleteSpace(DASHBOARD_SPACE);
      });

      afterEach(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage();
        await deleteOrphanedDashboard('fleet-orphan-dash-1');
        await deleteOrphanedDashboard('fleet-orphan-dash-2');
        await deleteOrphanedDashboard('fleet-orphan-dash-default-1');
      });

      it('succeeds on a fresh install when two orphaned dashboard SOs share the same originId in a non-default space', async () => {
        // Simulate two prior failed installs of all_assets into DASHBOARD_SPACE: each
        // allocated a new UUID dashboard with originId=sample_dashboard but did not
        // finish flushing refs. Without Fix 1, the next install raises ambiguous_conflict
        // because the SO importer finds two destinations with the same origin.
        await injectOrphanedDashboard('fleet-orphan-dash-1', DASHBOARD_SPACE);
        await injectOrphanedDashboard('fleet-orphan-dash-2', DASHBOARD_SPACE);

        const response = await installPackage(DASHBOARD_SPACE);
        expect(response.status).to.be(200);
      });

      it('removes orphaned dashboard SOs in the target space during install', async () => {
        await injectOrphanedDashboard('fleet-orphan-dash-1', DASHBOARD_SPACE);
        await injectOrphanedDashboard('fleet-orphan-dash-2', DASHBOARD_SPACE);

        await installPackage(DASHBOARD_SPACE).expect(200);

        expect(await dashboardOrphanExists('fleet-orphan-dash-1')).to.be(false);
        expect(await dashboardOrphanExists('fleet-orphan-dash-2')).to.be(false);
      });

      it('does not delete orphaned dashboard SOs that belong to a different space', async () => {
        // Orphan lives in the default space; install targets DASHBOARD_SPACE. The cleanup
        // must be namespace-scoped and must not delete objects from other spaces.
        await injectOrphanedDashboard('fleet-orphan-dash-default-1');

        await installPackage(DASHBOARD_SPACE).expect(200);

        expect(await dashboardOrphanExists('fleet-orphan-dash-default-1')).to.be(true);
      });

      it('succeeds on reinstall when a dashboard orphan from a failed reinstall is present', async () => {
        await installPackage(DASHBOARD_SPACE).expect(200);
        await injectOrphanedDashboard('fleet-orphan-dash-1', DASHBOARD_SPACE);

        const reinstallResponse = await installPackage(DASHBOARD_SPACE);
        expect(reinstallResponse.status).to.be(200);
      });

      it('removes the orphaned dashboard SO left by a failed reinstall', async () => {
        await installPackage(DASHBOARD_SPACE).expect(200);
        await injectOrphanedDashboard('fleet-orphan-dash-1', DASHBOARD_SPACE);

        await installPackage(DASHBOARD_SPACE).expect(200);

        expect(await dashboardOrphanExists('fleet-orphan-dash-1')).to.be(false);
      });
    });
  });
}
