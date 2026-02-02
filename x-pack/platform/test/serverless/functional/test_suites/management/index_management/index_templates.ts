/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  const TEST_TEMPLATE = 'a_test_template';
  const INDEX_PATTERN = `index_pattern_${Math.random()}`;

  describe('Index Templates', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    beforeEach(async () => {
      await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
    });

    after(async () => {
      log.debug('Cleaning up created template');

      try {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      } catch (e) {
        log.debug('[Setup error] Error creating test policy');
        throw e;
      }
    });

    it('renders the index templates tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/templates`);
    });

    describe('Index template list', () => {
      before(async () => {
        await es.indices.putIndexTemplate({
          name: TEST_TEMPLATE,
          index_patterns: [INDEX_PATTERN],
        });
      });

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE }, { ignore: [404] });
      });

      it('Displays the test template in the list of templates', async () => {
        const templates = await testSubjects.findAll('row');

        const getTemplateName = async (template: WebElementWrapper) => {
          const templateNameElement = await template.findByTestSubject('templateDetailsLink');
          return await templateNameElement.getVisibleText();
        };

        const templatesList = await Promise.all(
          templates.map((template) => getTemplateName(template))
        );

        const newTemplateExists = Boolean(
          templatesList.find((templateName) => templateName === TEST_TEMPLATE)
        );

        expect(newTemplateExists).to.be(true);
      });
    });

    describe('Create index template', () => {
      const TEST_TEMPLATE_NAME = `test_template_${Date.now()}`;

      beforeEach(async () => {
        await testSubjects.click('createTemplateButton');

        await testSubjects.setValue('nameField', TEST_TEMPLATE_NAME);
        await testSubjects.setValue('indexPatternsField', INDEX_PATTERN);
      });

      afterEach(async () => {
        await es.indices.deleteIndexTemplate({ name: TEST_TEMPLATE_NAME }, { ignore: [404] });
      });

      it('Creates index template', async () => {
        // Click form summary step and then the submit button
        await testSubjects.click('formWizardStep-5');
        await testSubjects.click('nextButton');

        await retry.try(async () => {
          expect(await testSubjects.getVisibleText('title')).to.contain(TEST_TEMPLATE_NAME);
        });
        await testSubjects.click('closeDetailsButton');
      });

      it('can create an index template with logsdb index mode', async () => {
        await testSubjects.click('indexModeField');
        await testSubjects.click('index_mode_logsdb');

        // Click form summary step and then the submit button
        await testSubjects.click('formWizardStep-5');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be('LogsDB');

        // Click update template
        await pageObjects.indexManagement.clickNextButton();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Close detail tab
        expect(await testSubjects.getVisibleText('indexModeValue')).to.be('LogsDB');
        await testSubjects.click('closeDetailsButton');
      });
    });

    describe('Modify index template', () => {
      const INDEX_TEMPLATE_NAME = 'index-template-test-name';

      before(async () => {
        await es.indices.putIndexTemplate({
          name: INDEX_TEMPLATE_NAME,
          index_patterns: ['logsdb-test-index-pattern'],
          data_stream: {},
          template: {
            settings: {
              mode: 'logsdb',
            },
          },
        });

        await testSubjects.click('reloadButton');
      });

      after(async () => {
        await es.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
      });

      it('can modify ignore_above, ignore_malformed, ignore_dynamic_beyond_limit, subobjects and timestamp format in an index template with logsdb index mode', async () => {
        await pageObjects.indexManagement.clickIndexTemplateNameLink(INDEX_TEMPLATE_NAME);
        await testSubjects.click('manageTemplateButton');
        await testSubjects.click('editIndexTemplateButton');
        await pageObjects.header.waitUntilLoadingHasFinished();

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
        await testSubjects.click('advancedOptionsTab');

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

        // Verify Index Settings
        await testSubjects.click('settingsTabBtn');
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
        await testSubjects.click('mappingsTabBtn');
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('mappingsTabContent')).to.be(true);
        const mappingsTabContent = await testSubjects.getVisibleText('mappingsTabContent');
        expect(JSON.parse(mappingsTabContent)).to.eql({
          dynamic_date_formats: ['basic_date'],
          subobjects: false,
        });

        // Close detail tab
        await testSubjects.click('closeDetailsButton');
      });
    });
  });
};
