/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const log = getService('log');
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const TEST_DS_NAME = 'test-ds-1';

  const INHERIT_CHECKBOX = 'dataLifecycleInheritCheckbox';
  const DELETE_PHASE_CARD = 'dlmPhasesSelectorDeletePhaseCard';

  const openLifecycleFlyout = async (dataStreamName: string) => {
    await pageObjects.indexManagement.searchAndClickDataStreamNameLink(dataStreamName);
    await testSubjects.click('manageDataStreamButton');
    await testSubjects.click('editDataLifecycleButton');
    await testSubjects.existOrFail('editDataLifecycleFlyoutApplyButton');
  };

  // Stops inheriting the lifecycle so explicit inputs become editable (only when currently
  // inheriting). Safe to call when the current stream cannot inherit (no checkbox rendered).
  const stopInheritingLifecycle = async () => {
    if (
      (await testSubjects.exists(INHERIT_CHECKBOX, { allowHidden: true })) &&
      (await testSubjects.isChecked(INHERIT_CHECKBOX))
    ) {
      await testSubjects.click(INHERIT_CHECKBOX);
    }
  };

  // Applies the lifecycle change and waits for the flyout to close. Applying persists through the
  // API, closes the details panel and reloads the list, which can take a few seconds.
  const applyLifecycleChange = async () => {
    await testSubjects.click('editDataLifecycleFlyoutApplyButton');
    await testSubjects.missingOrFail('editDataLifecycleFlyoutApplyButton', { timeout: 30000 });
  };

  enum INDEX_MODE {
    STANDARD = 'Standard',
    LOGSDB = 'LogsDB',
    TIME_SERIES = 'Time series',
  }

  describe('Data Streams', () => {
    before(async () => {
      log.debug('Creating required data stream');
      try {
        await es.cluster.putComponentTemplate({
          name: `${TEST_DS_NAME}_mapping`,
          template: {
            settings: { mode: undefined },
            mappings: {
              properties: {
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
        });

        await es.indices.putIndexTemplate({
          name: `index_template_${TEST_DS_NAME}`,
          index_patterns: [TEST_DS_NAME],
          data_stream: {},
          composed_of: [`${TEST_DS_NAME}_mapping`],
          _meta: {
            description: `Template for ${TEST_DS_NAME} testing index`,
          },
        });

        await es.indices.createDataStream({
          name: TEST_DS_NAME,
        });
      } catch (e) {
        log.debug('[Setup error] Error creating test data stream');
        throw e;
      }

      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
    });

    after(async () => {
      log.debug('Cleaning up created data stream');

      try {
        await es.indices.deleteDataStream({ name: TEST_DS_NAME });
        await es.indices.deleteIndexTemplate({
          name: `index_template_${TEST_DS_NAME}`,
        });
        await es.cluster.deleteComponentTemplate({
          name: `${TEST_DS_NAME}_mapping`,
        });
      } catch (e) {
        log.debug('[Teardown error] Error deleting test data stream');
        throw e;
      }
    });

    it('renders the data streams tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams`);
    });

    it('shows the details flyout when clicking on a data stream', async () => {
      // Open details flyout
      await pageObjects.indexManagement.searchAndClickDataStreamNameLink(TEST_DS_NAME);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/data_streams/${TEST_DS_NAME}`);
      // Assert that flyout is opened
      expect(await testSubjects.exists('dataStreamDetailPanel')).to.be(true);
      // Close flyout
      await testSubjects.click('closeDetailsButton');
    });

    describe('data retention', function () {
      // failsOnMKI, see https://github.com/elastic/kibana/issues/181242
      this.tags(['failsOnMKI']);
      it('allows to update data retention', async () => {
        await openLifecycleFlyout(TEST_DS_NAME);
        await testSubjects.click('flyoutTab-successful_data');
        await stopInheritingLifecycle();

        // Ensure the delete phase is enabled so a retention period can be set.
        if (!(await testSubjects.exists('deleteDurationValue'))) {
          await testSubjects.click(DELETE_PHASE_CARD);
        }
        // Set the retention to 7 days.
        await testSubjects.setValue('deleteDurationValue', '7');

        await applyLifecycleChange();

        // Applying closes the details panel and reloads the list; reopen to verify the summary.
        await pageObjects.indexManagement.searchAndClickDataStreamNameLink(TEST_DS_NAME);
        await retry.try(async () => {
          const detail = await testSubjects.getVisibleText('successfulIngestLifecycleDetail');
          expect(detail).to.contain('7 days');
        });
        await testSubjects.click('closeDetailsButton');
      });

      describe('Project level data retention checks - security solution', () => {
        this.tags(['skipSvlOblt', 'skipSvlSearch']);

        it('shows project data retention in the datastreams list', async () => {
          // Ensure the callout is visible by setting localStorage
          await browser.setLocalStorageItem('showProjectLevelRetention', 'true');
          await browser.refresh();
          await pageObjects.header.waitUntilLoadingHasFinished();

          expect(await testSubjects.exists('projectLevelRetentionLink')).to.be(true);
          expect(await testSubjects.exists('projectLevelRetentionCallout')).to.be(true);
          expect(await testSubjects.exists('cloudLinkButton')).to.be(true);
        });
      });

      it('does not offer ILM as a lifecycle method in serverless', async () => {
        // ILM is not available in serverless, so the lifecycle flyout does not render the
        // DLM/ILM method picker on the successful data tab.
        await openLifecycleFlyout(TEST_DS_NAME);
        await testSubjects.click('flyoutTab-successful_data');

        expect(await testSubjects.exists('editDataLifecycle-methodCard-ilm')).to.be(false);
        expect(await testSubjects.exists('editDataLifecycle-methodCard-dlm')).to.be(false);

        // Close the edit flyout (ESC closes the EuiFlyout). Close the details panel too if it is
        // still open afterwards.
        await browser.pressKeys(browser.keys.ESCAPE);
        if (await testSubjects.exists('closeDetailsButton', { timeout: 3000 })) {
          await testSubjects.click('closeDetailsButton');
        }
      });
    });

    describe('Modify data streams index mode', () => {
      const TEST_DS_NAME_INDEX_MODE = 'test-ds';
      const setIndexModeTemplate = async (settings: object) => {
        await es.indices.putIndexTemplate({
          name: `index_template_${TEST_DS_NAME_INDEX_MODE}`,
          index_patterns: [TEST_DS_NAME_INDEX_MODE],
          data_stream: {},
          template: {
            settings,
          },
        });
        await es.indices.createDataStream({
          name: TEST_DS_NAME_INDEX_MODE,
        });
        await testSubjects.click('reloadButton');
      };

      const verifyIndexModeIsOrigin = async (indexModeName: string) => {
        // Open details flyout of data stream
        await pageObjects.indexManagement.searchAndClickDataStreamNameLink(TEST_DS_NAME_INDEX_MODE);
        // Check that index mode detail exists and its label is origin
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be(indexModeName);
        // Close flyout
        await testSubjects.click('closeDetailsButton');
        // Navigate to the templates tab
        await pageObjects.indexManagement.changeTabs('templatesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Edit template
        await pageObjects.indexManagement.clickIndexTemplateNameLink(
          `index_template_${TEST_DS_NAME_INDEX_MODE}`
        );
        await testSubjects.click('manageTemplateButton');
        await testSubjects.click('editIndexTemplateButton');

        // Verify index mode is origin
        expect(await testSubjects.getVisibleText('indexModeField')).to.be(indexModeName);
      };

      const changeIndexMode = async (indexModeSelector: string) => {
        // Modify index mode
        await testSubjects.click('indexModeField');
        await testSubjects.click(indexModeSelector);
      };

      const verifyModeHasBeenChanged = async (indexModeName: string) => {
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be(indexModeName);

        // Click update template
        await pageObjects.indexManagement.clickNextButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify index mode and close detail tab
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be(indexModeName);
        await testSubjects.click('closeDetailsButton');

        // Perform rollover so that index mode of data stream is updated
        await es.indices.rollover({
          alias: TEST_DS_NAME_INDEX_MODE,
        });

        // Navigate to the data streams tab
        await pageObjects.indexManagement.changeTabs('data_streamsTab');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Open data stream
        await pageObjects.indexManagement.searchAndClickDataStreamNameLink(TEST_DS_NAME_INDEX_MODE);
        // Check that index mode detail exists and its label is destination index mode
        expect(await testSubjects.exists('indexModeDetail')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeDetail')).to.be(indexModeName);
        // Close flyout
        await testSubjects.click('closeDetailsButton');
      };

      before(async () => {
        await pageObjects.indexManagement.navigateToIndexManagementTab('data_streams');
      });

      afterEach(async () => {
        await log.debug('Cleaning up created data stream');

        try {
          await es.indices.deleteDataStream({ name: TEST_DS_NAME_INDEX_MODE });
          await es.indices.deleteIndexTemplate({
            name: `index_template_${TEST_DS_NAME_INDEX_MODE}`,
          });
        } catch (e) {
          log.debug('Error deleting test data stream');
          throw e;
        }
      });

      it('allows to upgrade data stream from standard to logsdb index mode', async () => {
        await setIndexModeTemplate({
          mode: 'standard',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.STANDARD);

        await changeIndexMode('index_mode_logsdb');
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.LOGSDB);
      });

      it('allows to downgrade data stream from logsdb to standard index mode', async () => {
        await setIndexModeTemplate({
          mode: 'logsdb',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.LOGSDB);

        await changeIndexMode('index_mode_standard');
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        await verifyModeHasBeenChanged(INDEX_MODE.STANDARD);
      });

      // Fails because of https://github.com/elastic/elasticsearch/issues/126473
      it.skip('allows to upgrade data stream from time series to logsdb index mode', async () => {
        await setIndexModeTemplate({
          mode: 'time_series',
          routing_path: 'test',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.TIME_SERIES);

        await changeIndexMode('index_mode_logsdb');

        await testSubjects.click('formWizardStep-2');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Modify Index settings
        await testSubjects.setValue('kibanaCodeEditor', '{}', {
          clearWithKeyboard: true,
        });
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');

        await verifyModeHasBeenChanged(INDEX_MODE.LOGSDB);
      });

      // Fails because of https://github.com/elastic/elasticsearch/issues/126473
      it.skip('allows to downgrade data stream from logsdb to time series index mode', async () => {
        await setIndexModeTemplate({
          mode: 'logsdb',
        });
        await verifyIndexModeIsOrigin(INDEX_MODE.LOGSDB);

        await changeIndexMode('index_mode_time_series');

        await testSubjects.click('formWizardStep-2');
        await pageObjects.header.waitUntilLoadingHasFinished();
        // Modify Index settings
        await testSubjects.setValue(
          'kibanaCodeEditor',
          JSON.stringify({ index: { mode: 'time_series', routing_path: 'test' } }),
          {
            clearWithKeyboard: true,
          }
        );
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');

        await verifyModeHasBeenChanged(INDEX_MODE.TIME_SERIES);
      });
    });
  });
};
