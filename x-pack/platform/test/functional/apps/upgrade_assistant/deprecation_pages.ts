/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const security = getService('security');
  const log = getService('log');

  describe('Deprecation pages', function () {
    // Only run this test in 8 as the deprecation we are testing is only available in 8
    this.onlyEsVersion('8');
    this.tags(['skipFirefox', 'upgradeAssistant']);

    before(async () => {
      await security.testUser.setRoles(['superuser']);
      try {
        await es.cluster.putComponentTemplate({
          name: 'deprecated_template',
          template: {
            mappings: {
              _source: {
                mode: 'stored',
              },
            },
          },
        });
      } catch (e) {
        log.debug('[Setup error] Error setting up component template with es deprecation]');
        throw e;
      }
    });

    after(async () => {
      try {
        await es.cluster.deleteComponentTemplate({
          name: 'deprecated_template',
        });
      } catch (e) {
        log.debug('[Cleanup error] Error removing component template with es deprecation');
        throw e;
      }
      await security.testUser.restoreDefaults();
    });

    it('renders the Elasticsearch deprecations page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickEsDeprecationsPanel();

      await retry.waitFor('Elasticsearch deprecations table to be visible', async () => {
        return testSubjects.exists('esDeprecationsTable');
      });
    });

    it('renders the Elasticsearch upgrade readiness deprecations', async () => {
      const deprecationMessages = await testSubjects.getVisibleTextAll('defaultTableCell-message');

      expect(deprecationMessages[0]).to.contain(
        'Configuring source mode in mappings is deprecated'
      );
    });

    it('renders the Kibana deprecations page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickKibanaDeprecationsPanel();

      await retry.waitFor('Kibana deprecations table to be visible', async () => {
        return testSubjects.exists('kibanaDeprecations');
      });
    });
  });
}
