/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sha256 } from 'js-sha256';
import { CLOUD_USER_ID } from '@kbn/cloud-integration-saml-provider-plugin/constants';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const find = getService('find');
  const PageObjects = getPageObjects(['common']);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  describe('Cloud FullStory integration', function () {
    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);
    });

    it('initializes FullStory', async () => {
      await PageObjects.common.navigateToApp('home');
      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      // Check FullStory library loaded
      // @ts-expect-error
      expect(await browser.execute(() => typeof window.FSKibana === 'function')).to.eql(true);
    });

    it('records a FullStory session with the associated SAML user', async () => {
      // Get session ID once fullstory has initialized
      let sessionUrl: string | null = null;
      let attempts = 0;
      while (sessionUrl === null && attempts < 30) {
        // @ts-expect-error
        sessionUrl = await browser.execute(() => window.FSKibana.getCurrentSessionURL());
        attempts++;
        await delay(1000);
      }
      expect(typeof sessionUrl).to.eql('string');
      sessionUrl = sessionUrl!.replace('%3A', ':'); // undo encoding so comparisons work with API response

      // Check that the session was recorded in the FS API for the given user based on their hashed ID
      const hashedUserId = sha256(CLOUD_USER_ID);
      const fsSessions = await fetch(
        `https://www.fullstory.com/api/v1/sessions?uid=${hashedUserId}&limit=100`,
        {
          headers: {
            'content-type': 'application/json',
            Authorization: `Basic ${process.env.FULLSTORY_API_KEY}`,
          },
        }
      ).then((r) => r.json());
      expect(fsSessions.find((s: any) => s.FsUrl === sessionUrl)).not.to.be(undefined);
    });
  });
}
