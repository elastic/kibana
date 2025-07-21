/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const config = getService('config');
  const spacesService = getService('spaces');
  const { common, settings } = getPageObjects(['common', 'settings', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');

  describe('spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.savedObjects.cleanStandardList();

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('shows Management navlink', async () => {
        await common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Stack Management');
      });

      it(`data views listing shows create button`, async () => {
        await settings.navigateTo();
        await settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('createDataViewButton');
      });
    });

    describe('space with Data Views disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.savedObjects.cleanStandardList();
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['indexPatterns'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it(`redirects to management home`, async () => {
        await common.navigateToUrl('management', 'kibana/indexPatterns', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail('managementHome', {
          timeout: config.get('timeouts.waitFor'),
        });
      });
    });
  });
}
