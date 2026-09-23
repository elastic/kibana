/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { applicationUsageSchema } from '@kbn/kibana-usage-collection-plugin/server/collectors/application_usage/schema';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('Application Usage', function () {
    const { common } = getPageObjects(['common']);
    const browser = getService('browser');
    const retry = getService('retry');

    it('keys in the schema match the registered application IDs', async () => {
      await common.navigateToApp('home'); // Navigate to Home
      const appIds = await retry.tryForTime(10000, async () => {
        const ids = await browser.execute(
          () => (window as Window & { __applicationIds__?: string[] }).__applicationIds__
        );
        if (!Array.isArray(ids)) {
          throw new Error(
            'Failed to retrieve all the existing applications in Kibana. Did it fail to boot or to navigate to home?'
          );
        }
        return ids;
      });
      try {
        const enabledAppIds = Object.keys(applicationUsageSchema).filter(
          // Profiling is currently disabled by default as it's in closed beta
          (appId) => appId !== 'profiling'
        );
        expect(enabledAppIds.sort()).to.eql(appIds.sort());
      } catch (err) {
        err.message = `Application Usage's schema is not up-to-date with the actual registered apps. Please update it at src/platform/plugins/private/kibana_usage_collection/server/collectors/application_usage/schema.ts.\n${err.message}`;
        throw err;
      }
    });
  });
}
