/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const toasts = getService('toasts');
  const log = getService('log');
  const browser = getService('browser');
  const es = getService('es');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  const TEST_DS_NAME_1 = 'test-ds-1';
  const TEST_DS_NAME_2 = 'test-ds-2';
  const TEST_DATA_STREAM_NAMES = [TEST_DS_NAME_1, TEST_DS_NAME_2];

  describe('Data streams tab', function () {
    before(async () => {
      await log.debug('Creating required data stream');
      try {
        for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
          await es.indices.putIndexTemplate({
            name: `${dataStreamName}_index_template`,
            index_patterns: [dataStreamName],
            data_stream: {},
            _meta: {
              description: `Template for ${dataStreamName} testing index`,
            },
            template: {
              settings: { mode: undefined },
              mappings: {
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
              lifecycle: {
                enabled: true,
              },
            },
          });

          await es.indices.createDataStream({
            name: dataStreamName,
          });
        }
      } catch (e) {
        log.debug('[Setup error] Error creating test data stream');
        throw e;
      }

      await log.debug('Navigating to the data streams tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the data streams tab
      await pageObjects.indexManagement.changeTabs('data_streamsTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await log.debug('Cleaning up created data stream');

      try {
        for (const dataStreamName of TEST_DATA_STREAM_NAMES) {
          await es.indices.deleteDataStream({ name: dataStreamName });
          await es.indices.deleteIndexTemplate({
            name: `${dataStreamName}_index_template`,
          });
        }
      } catch (e) {
        log.debug('[Teardown error] Error deleting test data stream');
        throw e;
      }
    });

    it('shows the details flyout when clicking on a data stream', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams/${TEST_DS_NAME_1}`);
      // Assert that flyout is opened
      expect(await testSubjects.exists('dataStreamDetailPanel')).to.be(true);
      // Close flyout
      await testSubjects.click('closeDetailsButton');
    });

    describe('data retention modal', function () {
      describe('from details panel', function () {
        it('allows to update data retention', async () => {
          // Open details flyout
          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          // Open the edit retention dialog
          await testSubjects.click('manageDataStreamButton');
          await testSubjects.click('editDataRetentionButton');

          // Disable infinite retention
          await testSubjects.click('infiniteRetentionPeriod > input');
          // Set the retention to 7 hours
          await testSubjects.setValue('dataRetentionValue', '7');
          await testSubjects.click('show-filters-button');
          await testSubjects.click('filter-option-h');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain('Data retention updated');
          // Clear up toasts for next test
          await toasts.dismissAll();
        });

        it('allows to disable data retention', async () => {
          // Open details flyout
          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          // Open the edit retention dialog
          await testSubjects.click('manageDataStreamButton');
          await testSubjects.click('editDataRetentionButton');

          // Disable infinite retention
          await testSubjects.click('dataRetentionEnabledField > input');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain('Data retention disabled');
          // Clear up toasts for next test
          await toasts.dismissAll();
        });
      });

      describe('bulk edit modal', function () {
        it('allows to update data retention', async () => {
          // Select and manage mutliple data streams
          await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

          // Set the retention to 7 hours
          await testSubjects.setValue('dataRetentionValue', '7');
          await testSubjects.click('show-filters-button');
          await testSubjects.click('filter-option-h');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain(
            'Data retention has been updated for 2 data streams.'
          );
          // Clear up toasts for next test
          await toasts.dismissAll();
        });

        it('allows to disable data retention', async () => {
          // Select and manage mutliple data streams
          await pageObjects.indexManagement.clickBulkEditDataRetention(TEST_DATA_STREAM_NAMES);

          // Disable infinite retention
          await testSubjects.click('dataRetentionEnabledField > input');

          // Submit the form
          await testSubjects.click('saveButton');

          // Expect to see a success toast
          const successToast = await toasts.getElementByIndex(1);
          expect(await successToast.getVisibleText()).to.contain(
            'Data retention has been updated for 2 data streams.'
          );
          // Clear up toasts for next test
          await toasts.dismissAll();
        });
      });
    });

    describe('configure failure store modal', function () {
      it('allows to configure failure store from details panel', async () => {
        // Open details flyout
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
        // Open the configure failure store dialog
        await testSubjects.click('manageDataStreamButton');
        await testSubjects.click('configureFailureStoreButton');

        // Verify modal is open
        expect(await testSubjects.exists('configureFailureStoreModal')).to.be(true);

        // Enable failure store
        await testSubjects.click('enableDataStreamFailureStoreToggle > input');

        // Submit the form
        await testSubjects.click('saveButton');

        // Expect to see a success toast
        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain('Failure store enabled');
        // Clear up toasts for next test
        await toasts.dismissAll();
      });

      it('allows to disable failure store from details panel', async () => {
        // Open details flyout
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
        // Open the configure failure store dialog
        await testSubjects.click('manageDataStreamButton');
        await testSubjects.click('configureFailureStoreButton');

        // Verify modal is open
        expect(await testSubjects.exists('configureFailureStoreModal')).to.be(true);

        // Disable failure store (toggle off if it's on)
        await testSubjects.click('enableDataStreamFailureStoreToggle > input');

        // Submit the form
        await testSubjects.click('saveButton');

        // Expect to see a success toast
        const successToast = await toasts.getElementByIndex(1);
        expect(await successToast.getVisibleText()).to.contain('Failure store disabled');
        // Clear up toasts for next test
        await toasts.dismissAll();
      });
    });
  });
};
