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
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const browser = getService('browser');

  const INDEX_TEMPLATE_NAME = 'index-template-test-name';

  describe('Index template tab', function () {
    before(async () => {
      await log.debug('Navigating to the index templates tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    afterEach(async () => {
      await es.indices.deleteIndexTemplate(
        {
          name: INDEX_TEMPLATE_NAME,
        },
        { ignore: [404] }
      );

      if (await testSubjects.exists('reloadButton')) {
        await testSubjects.click('reloadButton');
      }
    });

    describe('index template creation', () => {
      beforeEach(async () => {
        // Click create template button
        await testSubjects.click('createTemplateButton');
        // Complete required fields from step 1
        await testSubjects.setValue('nameField', INDEX_TEMPLATE_NAME);
        await testSubjects.setValue('indexPatternsField', 'test-1');
      });

      afterEach(async () => {
        // Click Create template
        await pageObjects.indexManagement.clickNextButton();
        // Close detail tab
        await testSubjects.click('closeDetailsButton');
      });

      it('can create an index template with data retention', async () => {
        // Enable data retention
        await testSubjects.click('dataRetentionToggle > input');
        // Set the retention to 7 hours
        await testSubjects.setValue('valueDataRetentionField', '7');
        await testSubjects.click('show-filters-button');
        await testSubjects.click('filter-option-h');
        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await testSubjects.getVisibleText('lifecycleValue')).to.be('7 hours');
      });

      it('can create an index template with logsdb index mode', async () => {
        // Modify index mode
        await testSubjects.click('indexModeField');
        await testSubjects.click('index_mode_logsdb');

        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        expect(await testSubjects.exists('indexModeTitle')).to.be(true);
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be('LogsDB');
      });
    });

    describe('index template modification', () => {
      beforeEach(async () => {
        await es.indices.putIndexTemplate({
          name: INDEX_TEMPLATE_NAME,
          index_patterns: ['logsdb-test-index-pattern'],
          data_stream: {},
          template: {
            settings: {
              index: {
                mode: 'logsdb',
              },
            },
          },
        });

        await testSubjects.click('reloadButton');
        await pageObjects.indexManagement.clickIndexTemplateNameLink(INDEX_TEMPLATE_NAME);
        await testSubjects.click('manageTemplateButton');
        await testSubjects.click('editIndexTemplateButton');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      afterEach(async () => {
        if (await testSubjects.exists('closeDetailsButton')) {
          // Close Flyout to return to templates tab
          await testSubjects.click('closeDetailsButton');
        } else {
          // Comeback to templates tab
          await pageObjects.common.navigateToApp('indexManagement');
          await pageObjects.indexManagement.changeTabs('templatesTab');
        }
      });

      it('can modify ignore_above, ignore_malformed, ignore_dynamic_beyond_limit, subobjects and timestamp format in an index template with logsdb index mode', async () => {
        // Navigate to Index Settings
        await testSubjects.click('formWizardStep-2');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Modify Index settings
        await testSubjects.setValue(
          'kibanaCodeEditor',
          JSON.stringify({
            index: {
              mapping: {
                ignore_above: '20',
                total_fields: {
                  ignore_dynamic_beyond_limit: 'true',
                },
                ignore_malformed: 'true',
              },
            },
          }),
          {
            clearWithKeyboard: true,
          }
        );

        // Navigate to Mappings
        await testSubjects.click('formWizardStep-3');
        await pageObjects.header.waitUntilLoadingHasFinished();
        const mappingTabs = await testSubjects.findAll('formTab');
        await mappingTabs[3].click();

        // Modify timestamp format
        await testSubjects.click('comboBoxClearButton');
        await testSubjects.setValue('comboBoxInput', 'basic_date');
        await testSubjects.pressEnter('comboBoxInput');

        // Modify subobjects
        await testSubjects.click('subobjectsToggle');

        // Navigate to the last step of the wizard
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Click Create template
        await pageObjects.indexManagement.clickNextButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        const flyoutTabs = await testSubjects.findAll('tab');

        // Verify Index Settings
        await flyoutTabs[1].click();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('settingsTabContent')).to.be(true);
        const settingsTabContent = await testSubjects.getVisibleText('settingsTabContent');
        expect(JSON.parse(settingsTabContent)).to.eql({
          index: {
            mode: 'logsdb',
            mapping: {
              ignore_above: '20',
              total_fields: {
                ignore_dynamic_beyond_limit: 'true',
              },
              ignore_malformed: 'true',
            },
          },
        });

        // Verify Mappings
        await flyoutTabs[2].click();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('mappingsTabContent')).to.be(true);
        const mappingsTabContent = await testSubjects.getVisibleText('mappingsTabContent');
        expect(JSON.parse(mappingsTabContent)).to.eql({
          dynamic_date_formats: ['basic_date'],
          _source: {
            mode: 'synthetic',
          },
          subobjects: false,
        });
      });
      describe('syntethic source', () => {
        it('can not disable syntethic source in an index template with logsdb index mode', async () => {
          // Navigate to Mappings
          await testSubjects.click('formWizardStep-3');
          await pageObjects.header.waitUntilLoadingHasFinished();
          const mappingTabs = await testSubjects.findAll('formTab');
          await mappingTabs[3].click();

          // Modify source
          await testSubjects.click('sourceValueField');
          await testSubjects.click('disabledSourceFieldOption');

          // Navigate to the last step of the wizard
          await testSubjects.click('formWizardStep-5');
          await pageObjects.header.waitUntilLoadingHasFinished();

          // Click Create template
          await pageObjects.indexManagement.clickNextButton();
          await pageObjects.header.waitUntilLoadingHasFinished();

          expect(await testSubjects.exists('saveTemplateError')).to.be(true);

          await testSubjects.click('stepReviewPreviewTab');
          await pageObjects.header.waitUntilLoadingHasFinished();
          expect(await testSubjects.exists('simulateTemplatePreview')).to.be(true);
          expect(await testSubjects.getVisibleText('simulateTemplatePreview')).to.contain(
            '_source can not be disabled in index using [logsdb] index mode'
          );
        });
      });
    });

    describe('Index template list', () => {
      const TEST_TEMPLATE = 'a_test_template';
      const INDEX_PATTERN = `index_pattern_${Math.random()}`;

      before(async () => {
        await es.indices.putIndexTemplate({
          name: TEST_TEMPLATE,
          index_patterns: [INDEX_PATTERN],
          template: {
            settings: {
              default_pipeline: 'test_pipeline',
            },
          },
        });

        // Navigate to the index management
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the templates tab
        await pageObjects.indexManagement.changeTabs('templatesTab');
      });

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      });

      it('shows link to ingest pipeline when default pipeline is set', async () => {
        // Open details flyout
        await pageObjects.indexManagement.clickIndexTemplate(TEST_TEMPLATE);

        // Click on the linked ingest pipeline button
        const linkedPipelineButton = await testSubjects.find('linkedIngestPipeline');
        await linkedPipelineButton.click();

        // Expect to navigate to the ingest pipeline page
        await pageObjects.header.waitUntilLoadingHasFinished();
        // We should've now navigated to the ingest pipelines app
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain('/ingest/ingest_pipelines/edit/test_pipeline');
      });
    });
  });
};
