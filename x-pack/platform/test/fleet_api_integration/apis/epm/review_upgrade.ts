/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const TEST_PKG_NAME = 'review_upgrade_test_pkg';
const TEST_PKG_VERSION = '2.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  async function createTestInstallation() {
    await kibanaServer.savedObjects.create({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: TEST_PKG_NAME,
      attributes: {
        name: TEST_PKG_NAME,
        version: '1.0.0',
        install_status: 'installed',
        install_version: '1.0.0',
        install_started_at: new Date().toISOString(),
        install_source: 'registry',
        verification_status: 'unknown',
      },
      overwrite: true,
    });
  }

  async function deleteTestInstallation() {
    try {
      await kibanaServer.savedObjects.delete({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: TEST_PKG_NAME,
      });
    } catch {
      // ignore if already deleted
    }
  }

  async function writePendingReview(overrides: Record<string, unknown> = {}) {
    await kibanaServer.savedObjects.update({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: TEST_PKG_NAME,
      attributes: {
        pending_upgrade_review: {
          target_version: TEST_PKG_VERSION,
          reason: 'deprecated',
          created_at: new Date().toISOString(),
          ...overrides,
        },
      },
      overwrite: false,
    });
  }

  async function clearPendingReview() {
    try {
      await kibanaServer.savedObjects.update({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: TEST_PKG_NAME,
        attributes: {
          pending_upgrade_review: {},
        },
        overwrite: false,
      });
    } catch {
      // ignore
    }
  }

  async function getPendingReview() {
    const so = await kibanaServer.savedObjects.get({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      id: TEST_PKG_NAME,
    });
    return so.attributes.pending_upgrade_review;
  }

  describe('Review Upgrade API', () => {
    before(async () => {
      await createTestInstallation();
    });

    after(async () => {
      await deleteTestInstallation();
    });

    afterEach(async () => {
      await clearPendingReview();
    });

    it('should return 404 for a non-installed package', async () => {
      await supertest
        .post('/api/fleet/epm/packages/nonexistent_package_xyz/review_upgrade')
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'accept', target_version: '1.0.0' })
        .expect(404);
    });

    it('should return 404 when no pending review exists for the target version', async () => {
      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'accept', target_version: 'nonexistent_version' })
        .expect(404);
    });

    it('should set action to accepted when user accepts the upgrade', async () => {
      await writePendingReview();

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'accept', target_version: TEST_PKG_VERSION })
        .expect(200);

      const review = await getPendingReview();
      expect(review.action).to.eql('accepted');
      expect(review.target_version).to.eql(TEST_PKG_VERSION);
      expect(review.reason).to.eql('deprecated');
    });

    it('should set action to declined when user dismisses the upgrade', async () => {
      await writePendingReview();

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'decline', target_version: TEST_PKG_VERSION })
        .expect(200);

      const review = await getPendingReview();
      expect(review.action).to.eql('declined');
      expect(review.target_version).to.eql(TEST_PKG_VERSION);
      expect(review.reason).to.eql('deprecated');
    });

    it('should reset action to pending when user re-enables a declined review', async () => {
      await writePendingReview({ action: 'declined' });

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'pending', target_version: TEST_PKG_VERSION })
        .expect(200);

      const review = await getPendingReview();
      expect(review.action).to.eql('pending');
      expect(review.target_version).to.eql(TEST_PKG_VERSION);
      expect(review.reason).to.eql('deprecated');
    });

    it('should preserve deprecation_details when updating the action', async () => {
      const deprecationDetails = {
        description: 'This input has been deprecated',
        since: '2.0.0',
      };
      await writePendingReview({ deprecation_details: deprecationDetails });

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'accept', target_version: TEST_PKG_VERSION })
        .expect(200);

      const review = await getPendingReview();
      expect(review.action).to.eql('accepted');
      expect(review.deprecation_details).to.eql(deprecationDetails);
    });

    it('should allow transitioning from accepted back to pending', async () => {
      await writePendingReview({ action: 'accepted' });

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'pending', target_version: TEST_PKG_VERSION })
        .expect(200);

      const review = await getPendingReview();
      expect(review.action).to.eql('pending');
    });

    it('should reject invalid action values', async () => {
      await writePendingReview();

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'invalid_action', target_version: TEST_PKG_VERSION })
        .expect(400);
    });

    it('should reject requests without target_version', async () => {
      await writePendingReview();

      await supertest
        .post(`/api/fleet/epm/packages/${TEST_PKG_NAME}/review_upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({ action: 'accept' })
        .expect(400);
    });
  });
}
