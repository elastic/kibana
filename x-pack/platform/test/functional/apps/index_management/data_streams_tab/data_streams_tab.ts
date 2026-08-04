/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const toasts = getService('toasts');
  const log = getService('log');
  const browser = getService('browser');
  const es = getService('es');
  const security = getService('security');
  const retry = getService('retry');
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
      await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
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

    const openLifecycleFlyout = async (dataStreamName: string) => {
      await pageObjects.indexManagement.clickDataStreamNameLink(dataStreamName);
      await testSubjects.click('manageDataStreamButton');
      await testSubjects.click('editDataLifecycleButton');
      await testSubjects.existOrFail('editDataLifecycleFlyoutApplyButton');
    };

    const INHERIT_CHECKBOX = 'dataLifecycleInheritCheckbox';
    const DELETE_PHASE_CARD = 'dlmPhasesSelectorDeletePhaseCard';
    const FAILURE_STORE_CHECKBOX = 'editFailedDataLifecycle-enableFailureStoreCheckbox';

    const applyLifecycleChange = async () => {
      await testSubjects.click('editDataLifecycleFlyoutApplyButton');
      await testSubjects.missingOrFail('editDataLifecycleFlyoutApplyButton', { timeout: 30000 });
    };

    const stopInheritingLifecycle = async () => {
      if (
        (await testSubjects.exists(INHERIT_CHECKBOX, { allowHidden: true })) &&
        (await testSubjects.isChecked(INHERIT_CHECKBOX))
      ) {
        await testSubjects.click(INHERIT_CHECKBOX);
      }
    };

    describe('data lifecycle flyout', function () {
      describe('from details panel', function () {
        it('allows to update data retention', async () => {
          await openLifecycleFlyout(TEST_DS_NAME_1);
          await testSubjects.click('flyoutTab-successful_data');
          await stopInheritingLifecycle();

          // Ensure the delete phase is enabled so a retention period can be set (an inherited
          // infinite lifecycle leaves the delete phase turned off).
          if (!(await testSubjects.exists('deleteDurationValue'))) {
            await testSubjects.click(DELETE_PHASE_CARD);
          }
          // Set the retention to 7 days.
          await testSubjects.setValue('deleteDurationValue', '7');

          await applyLifecycleChange();

          // Applying closes the details panel and reloads the list; reopen to verify the summary.
          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          await retry.try(async () => {
            const detail = await testSubjects.getVisibleText('successfulIngestLifecycleDetail');
            expect(detail).to.contain('7 days');
          });
          await testSubjects.click('closeDetailsButton');
        });

        it('allows to keep data indefinitely', async () => {
          await openLifecycleFlyout(TEST_DS_NAME_1);
          await testSubjects.click('flyoutTab-successful_data');
          await stopInheritingLifecycle();

          // Turning off the delete phase keeps data indefinitely (infinite retention). The previous
          // test left an explicit 7 day retention, so the delete phase is currently enabled.
          if (await testSubjects.exists('deleteDurationValue')) {
            await testSubjects.click(DELETE_PHASE_CARD);
          }

          await applyLifecycleChange();

          await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
          await retry.try(async () => {
            const detail = await testSubjects.getVisibleText('successfulIngestLifecycleDetail');
            // Infinite retention is rendered as the infinity symbol.
            expect(detail).to.contain('∞');
          });
          await testSubjects.click('closeDetailsButton');
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

          // Wait for the modal to close after successful submission
          await testSubjects.missingOrFail('editDataRetentionModal');

          // Wait for and verify the success toast appears
          await retry.try(async () => {
            await toasts.assertCount(1);
            const successToastContent = await toasts.getContentByIndex(1);
            expect(successToastContent).to.contain(
              'Data retention has been updated for 2 data streams.'
            );
          });
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

          // Wait for the modal to close after successful submission
          await testSubjects.missingOrFail('editDataRetentionModal');

          // Wait for and verify the success toast appears
          await retry.try(async () => {
            await toasts.assertCount(1);
            const successToastContent = await toasts.getContentByIndex(1);
            expect(successToastContent).to.contain(
              'Data retention has been updated for 2 data streams.'
            );
          });
          // Clear up toasts for next test
          await toasts.dismissAll();
        });
      });
    });

    describe('failure store (failed data lifecycle)', function () {
      it('allows to enable failure store from the details panel', async () => {
        await openLifecycleFlyout(TEST_DS_NAME_1);
        await testSubjects.click('flyoutTab-failed_data');
        await stopInheritingLifecycle();

        // Enable the failure store if it is not already enabled.
        if (!(await testSubjects.isChecked(FAILURE_STORE_CHECKBOX))) {
          await testSubjects.click(FAILURE_STORE_CHECKBOX);
        }

        await applyLifecycleChange();

        // Applying closes the details panel and reloads the list; reopen to verify the summary.
        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
        await retry.try(async () => {
          const detail = await testSubjects.getVisibleText('failedIngestLifecycleDetail');
          // An enabled failure store is managed by the data stream lifecycle (not "Disabled").
          expect(detail).to.contain('Data stream lifecycle');
        });
        await testSubjects.click('closeDetailsButton');
      });

      it('allows to disable failure store from the details panel', async () => {
        await openLifecycleFlyout(TEST_DS_NAME_1);
        await testSubjects.click('flyoutTab-failed_data');
        await stopInheritingLifecycle();

        // Disable the failure store if it is currently enabled.
        if (await testSubjects.isChecked(FAILURE_STORE_CHECKBOX)) {
          await testSubjects.click(FAILURE_STORE_CHECKBOX);
        }

        await applyLifecycleChange();

        await pageObjects.indexManagement.clickDataStreamNameLink(TEST_DS_NAME_1);
        await retry.try(async () => {
          const detail = await testSubjects.getVisibleText('failedIngestLifecycleDetail');
          expect(detail).to.contain('Disabled');
        });
        await testSubjects.click('closeDetailsButton');
      });
    });
  });
};
