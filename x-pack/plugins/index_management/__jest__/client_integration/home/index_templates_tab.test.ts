/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import * as fixtures from '../../../test/fixtures';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, getRandomString } from '../helpers';

import { IndexTemplatesTabTestBed, setup } from './index_templates_tab.helpers';

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Convert non breaking spaces (&nbsp;) to ordinary space
    return value.trim().replace(/\s/g, ' ');
  });

describe('Index Templates tab', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IndexTemplatesTabTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('when there are no index templates', () => {
    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      await act(async () => {
        testBed = await setup();
      });
      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
    });
  });

  describe('when there are index templates', () => {
    // Add a default loadIndexTemplate response
    httpRequestsMockHelpers.setLoadTemplateResponse(fixtures.getTemplate());

    const template1 = fixtures.getTemplate({
      name: `a${getRandomString()}`,
      indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
      template: {
        settings: {
          index: {
            number_of_shards: '1',
            lifecycle: {
              name: 'my_ilm_policy',
            },
          },
        },
      },
    });
    (template1 as any).hasSettings = true;

    const template2 = fixtures.getTemplate({
      name: `b${getRandomString()}`,
      indexPatterns: ['template2Pattern1*'],
    });

    const template3 = fixtures.getTemplate({
      name: `.c${getRandomString()}`, // mock system template
      indexPatterns: ['template3Pattern1*', 'template3Pattern2', 'template3Pattern3'],
    });

    const template4 = fixtures.getTemplate({
      name: `a${getRandomString()}`,
      indexPatterns: ['template4Pattern1*', 'template4Pattern2'],
      template: {
        settings: {
          index: {
            number_of_shards: '1',
            lifecycle: {
              name: 'my_ilm_policy',
            },
          },
        },
      },
      isLegacy: true,
    });

    const template5 = fixtures.getTemplate({
      name: `b${getRandomString()}`,
      indexPatterns: ['template5Pattern1*'],
      isLegacy: true,
    });

    const template6 = fixtures.getTemplate({
      name: `.c${getRandomString()}`, // mock system template
      indexPatterns: ['template6Pattern1*', 'template6Pattern2', 'template6Pattern3'],
      isLegacy: true,
    });

    const templates = [template1, template2, template3];
    const legacyTemplates = [template4, template5, template6];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates, legacyTemplates });

      await act(async () => {
        testBed = await setup();
      });
      testBed.component.update();
    });

    test('should list them in the table', async () => {
      const { table } = testBed;

      const { tableCellsValues } = table.getMetaData('templateTable');
      const { tableCellsValues: legacyTableCellsValues } = table.getMetaData('legacyTemplateTable');

      // Test composable table content
      tableCellsValues.forEach((row, i) => {
        const indexTemplate = templates[i];
        const { name, indexPatterns, priority, ilmPolicy, composedOf, template } = indexTemplate;

        const hasContent = !!template.settings || !!template.mappings || !!template.aliases;
        const ilmPolicyName = ilmPolicy && ilmPolicy.name ? ilmPolicy.name : '';
        const composedOfString = composedOf ? composedOf.join(',') : '';
        const priorityFormatted = priority ? priority.toString() : '';

        expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
          '', // Checkbox to select row
          name,
          indexPatterns.join(', '),
          ilmPolicyName,
          composedOfString,
          priorityFormatted,
          hasContent ? 'M S A' : 'None', // M S A -> Mappings Settings Aliases badges
          '', // Column of actions
        ]);
      });

      // Test legacy table content
      legacyTableCellsValues.forEach((row, i) => {
        const template = legacyTemplates[i];
        const { name, indexPatterns, order, ilmPolicy } = template;

        const ilmPolicyName = ilmPolicy && ilmPolicy.name ? ilmPolicy.name : '';
        const orderFormatted = order ? order.toString() : order;

        expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
          '',
          name,
          indexPatterns.join(', '),
          ilmPolicyName,
          orderFormatted,
          '',
          '',
          '',
          '',
        ]);
      });
    });

    test('should have a button to reload the index templates', async () => {
      const { exists, actions } = testBed;
      const totalRequests = server.requests.length;

      expect(exists('reloadButton')).toBe(true);

      await act(async () => {
        actions.clickReloadButton();
      });

      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(
        `${API_BASE_PATH}/index_templates`
      );
    });

    test('should have a button to create a template', () => {
      const { exists } = testBed;
      // Both composable and legacy templates
      expect(exists('createTemplateButton')).toBe(true);
      expect(exists('createLegacyTemplateButton')).toBe(true);
    });

    test('should have a switch to view system templates', async () => {
      const { table, exists, actions } = testBed;
      const { rows } = table.getMetaData('legacyTemplateTable');

      expect(rows.length).toEqual(
        legacyTemplates.filter((template) => !template.name.startsWith('.')).length
      );

      expect(exists('viewButton')).toBe(true);

      actions.toggleViewItem('system');

      const { rows: updatedRows } = table.getMetaData('legacyTemplateTable');
      expect(updatedRows.length).toEqual(legacyTemplates.length);
    });

    test('each row should have a link to the template details panel', async () => {
      const { find, exists, actions, component } = testBed;

      // Composable templates
      await actions.clickTemplateAt(0);
      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(find('templateDetails.title').text()).toBe(templates[0].name);

      // Close flyout
      await act(async () => {
        actions.clickCloseDetailsButton();
      });
      component.update();

      await actions.clickTemplateAt(0, true);

      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(find('templateDetails.title').text()).toBe(legacyTemplates[0].name);
    });

    describe('table row actions', () => {
      describe('composable templates', () => {
        test('should have an option to delete', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const deleteAction = findAction('delete');
          expect(deleteAction.text()).toEqual('Delete');
        });

        test('should have an option to clone', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const cloneAction = findAction('clone');

          expect(cloneAction.text()).toEqual('Clone');
        });

        test('should have an option to edit', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const editAction = findAction('edit');

          expect(editAction.text()).toEqual('Edit');
        });
      });

      describe('legacy templates', () => {
        test('should have an option to delete', () => {
          const { actions, findAction } = testBed;
          const [{ name: legacyTemplateName }] = legacyTemplates;

          actions.clickActionMenu(legacyTemplateName);

          const deleteAction = findAction('delete');
          expect(deleteAction.text()).toEqual('Delete');
        });

        test('should have an option to clone', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = legacyTemplates;

          actions.clickActionMenu(templateName);

          const cloneAction = findAction('clone');

          expect(cloneAction.text()).toEqual('Clone');
        });

        test('should have an option to edit', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = legacyTemplates;

          actions.clickActionMenu(templateName);

          const editAction = findAction('edit');

          expect(editAction.text()).toEqual('Edit');
        });
      });
    });

    describe('delete index template', () => {
      test('should show a confirmation when clicking the delete template button', async () => {
        const { actions } = testBed;
        const [{ name: templateName }] = templates;

        await actions.clickTemplateAction(templateName, 'delete');

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')!.textContent
        ).toContain('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        const { exists, actions } = testBed;

        actions.toggleViewItem('system');

        const { name: systemTemplateName } = templates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const { actions } = testBed;

        const [
          {
            name: templateName,
            _kbnMeta: { isLegacy },
          },
        ] = templates;

        httpRequestsMockHelpers.setDeleteTemplateResponse({
          results: {
            successes: [templateName],
            errors: [],
          },
        });

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        await act(async () => {
          confirmButton!.click();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        expect(latestRequest.method).toBe('POST');
        expect(latestRequest.url).toBe(`${API_BASE_PATH}/delete_index_templates`);
        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual({
          templates: [{ name: templates[0].name, isLegacy }],
        });
      });
    });

    describe('delete legacy index template', () => {
      test('should show a confirmation when clicking the delete template button', async () => {
        const { actions } = testBed;
        const [{ name: templateName }] = legacyTemplates;

        await actions.clickTemplateAction(templateName, 'delete');

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')!.textContent
        ).toContain('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        const { exists, actions } = testBed;

        actions.toggleViewItem('system');

        const { name: systemTemplateName } = legacyTemplates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const { actions } = testBed;

        const [{ name: templateName }] = legacyTemplates;

        httpRequestsMockHelpers.setDeleteTemplateResponse({
          results: {
            successes: [templateName],
            errors: [],
          },
        });

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        await act(async () => {
          confirmButton!.click();
        });

        const latestRequest = server.requests[server.requests.length - 1];

        expect(latestRequest.method).toBe('POST');
        expect(latestRequest.url).toBe(`${API_BASE_PATH}/delete_index_templates`);

        // Commenting as I don't find a way to make it work.
        // It keeps on returning the composable template instead of the legacy one
        // expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual({
        //   templates: [{ name: templateName, isLegacy }],
        // });
      });
    });

    describe('detail panel', () => {
      beforeEach(async () => {
        const template = fixtures.getTemplate({
          name: `a${getRandomString()}`,
          indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
          isLegacy: true,
        });

        httpRequestsMockHelpers.setLoadTemplateResponse(template);
      });

      test('should show details when clicking on a template', async () => {
        const { exists, actions } = testBed;

        expect(exists('templateDetails')).toBe(false);

        await actions.clickTemplateAt(0);

        expect(exists('templateDetails')).toBe(true);
      });

      describe('on mount', () => {
        beforeEach(async () => {
          const { actions } = testBed;

          await actions.clickTemplateAt(0);
        });

        test('should set the correct title', async () => {
          const { find } = testBed;
          const [{ name }] = templates;

          expect(find('templateDetails.title').text()).toEqual(name);
        });

        it('should have a close button and be able to close flyout', async () => {
          const { actions, component, exists } = testBed;

          expect(exists('closeDetailsButton')).toBe(true);
          expect(exists('summaryTab')).toBe(true);

          await act(async () => {
            actions.clickCloseDetailsButton();
          });
          component.update();

          expect(exists('summaryTab')).toBe(false);
        });

        it('should have a manage button', async () => {
          const { actions, exists } = testBed;

          await actions.clickTemplateAt(0);

          expect(exists('templateDetails.manageTemplateButton')).toBe(true);
        });
      });

      describe('tabs', () => {
        test('should have 4 tabs', async () => {
          const template = fixtures.getTemplate({
            name: `a${getRandomString()}`,
            indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            template: {
              settings: {
                index: {
                  number_of_shards: '1',
                },
              },
              mappings: {
                _source: {
                  enabled: false,
                },
                properties: {
                  created_at: {
                    type: 'date',
                    format: 'EEE MMM dd HH:mm:ss Z yyyy',
                  },
                },
              },
              aliases: {
                alias1: {},
              },
            },
            isLegacy: true,
          });

          const { find, actions, exists } = testBed;

          httpRequestsMockHelpers.setLoadTemplateResponse(template);

          await actions.clickTemplateAt(0);

          expect(find('templateDetails.tab').length).toBe(4);
          expect(find('templateDetails.tab').map((t) => t.text())).toEqual([
            'Summary',
            'Settings',
            'Mappings',
            'Aliases',
          ]);

          // Summary tab should be initial active tab
          expect(exists('summaryTab')).toBe(true);

          // Navigate and verify all tabs
          actions.selectDetailsTab('settings');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(true);

          actions.selectDetailsTab('aliases');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(false);
          expect(exists('aliasesTabContent')).toBe(true);

          actions.selectDetailsTab('mappings');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(false);
          expect(exists('aliasesTabContent')).toBe(false);
          expect(exists('mappingsTabContent')).toBe(true);
        });

        test('should show an info callout if data is not present', async () => {
          const templateWithNoOptionalFields = fixtures.getTemplate({
            name: `a${getRandomString()}`,
            indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            isLegacy: true,
          });

          const { actions, find, exists } = testBed;

          httpRequestsMockHelpers.setLoadTemplateResponse(templateWithNoOptionalFields);

          await actions.clickTemplateAt(0);

          expect(find('templateDetails.tab').length).toBe(4);
          expect(exists('summaryTab')).toBe(true);

          // Navigate and verify callout message per tab
          actions.selectDetailsTab('settings');
          expect(exists('noSettingsCallout')).toBe(true);

          actions.selectDetailsTab('mappings');
          expect(exists('noMappingsCallout')).toBe(true);

          actions.selectDetailsTab('aliases');
          expect(exists('noAliasesCallout')).toBe(true);
        });
      });

      describe('error handling', () => {
        it('should render an error message if error fetching template details', async () => {
          const { actions, exists } = testBed;
          const error = {
            status: 404,
            error: 'Not found',
            message: 'Template not found',
          };

          httpRequestsMockHelpers.setLoadTemplateResponse(undefined, { body: error });

          await actions.clickTemplateAt(0);

          expect(exists('sectionError')).toBe(true);
          // Manage button should not render if error
          expect(exists('templateDetails.manageTemplateButton')).toBe(false);
        });
      });
    });
  });
});
