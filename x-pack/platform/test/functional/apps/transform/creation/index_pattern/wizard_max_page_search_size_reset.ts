/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE_LATEST,
} from '@kbn/transform-plugin/common/constants';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('wizard max_page_search_size reset', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');
      await transform.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.testResources.deleteDataViewByTitle('ft_ecommerce');
      await transform.securityUI.logout();
    });

    it('resets max_page_search_size to the latest default when switching pivot → latest', async () => {
      await transform.testExecution.logTestStep('loads the home page');
      await transform.navigation.navigateTo();
      await transform.management.assertTransformListPageExists();

      await transform.testExecution.logTestStep('opens the source selection modal');
      await transform.management.startTransformCreation();

      await transform.testExecution.logTestStep('selects the source data');
      await transform.sourceSelection.selectSource('ft_ecommerce');

      await transform.testExecution.logTestStep('displays the define step with pivot selected');
      await transform.wizard.assertDefineStepActive();
      await transform.wizard.assertSelectedTransformFunction('pivot');

      await transform.testExecution.logTestStep('switches to latest transform function');
      await transform.wizard.selectTransformFunction('latest');

      await transform.testExecution.logTestStep('configures the minimum latest transform fields');
      await transform.wizard.addUniqueKeyEntry('geoip.country_iso_code', 'geoip.country_iso_code');
      await transform.wizard.setSortFieldValue('order_date', 'order_date');

      await transform.testExecution.logTestStep('advances to the details step');
      await transform.wizard.advanceToDetailsStep();

      await transform.testExecution.logTestStep('opens the advanced settings accordion');
      await transform.wizard.openTransformAdvancedSettingsAccordion();

      await transform.testExecution.logTestStep(
        `asserts max_page_search_size is reset to the latest default (${DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE_LATEST})`
      );
      await transform.wizard.assertTransformMaxPageSearchSizeValue(
        DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE_LATEST
      );
    });

    it('resets max_page_search_size to the pivot default when switching latest → pivot', async () => {
      await transform.testExecution.logTestStep('loads the home page');
      await transform.navigation.navigateTo();
      await transform.management.assertTransformListPageExists();

      await transform.testExecution.logTestStep('opens the source selection modal');
      await transform.management.startTransformCreation();

      await transform.testExecution.logTestStep('selects the source data');
      await transform.sourceSelection.selectSource('ft_ecommerce');

      await transform.testExecution.logTestStep('displays the define step with pivot selected');
      await transform.wizard.assertDefineStepActive();
      await transform.wizard.assertSelectedTransformFunction('pivot');

      await transform.testExecution.logTestStep('switches to latest, then back to pivot');
      await transform.wizard.selectTransformFunction('latest');
      await transform.wizard.selectTransformFunction('pivot');

      await transform.testExecution.logTestStep('configures the minimum pivot transform fields');
      await transform.wizard.addGroupByEntry(0, 'terms(category)', 'category');
      await transform.wizard.addAggregationEntry(
        0,
        'avg(products.base_price)',
        'products.base_price.avg'
      );

      await transform.testExecution.logTestStep('advances to the details step');
      await transform.wizard.advanceToDetailsStep();

      await transform.testExecution.logTestStep('opens the advanced settings accordion');
      await transform.wizard.openTransformAdvancedSettingsAccordion();

      await transform.testExecution.logTestStep(
        `asserts max_page_search_size is reset to the pivot default (${DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE})`
      );
      await transform.wizard.assertTransformMaxPageSearchSizeValue(
        DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE
      );
    });
  });
}
