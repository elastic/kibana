/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { ComponentTemplateListItem } from '../../shared_imports';

import { setupEnvironment, pageHelpers } from './helpers';
import { ComponentTemplateListTestBed } from './helpers/component_template_list.helpers';
import { API_BASE_PATH } from './helpers/constants';

const { setup } = pageHelpers.componentTemplateList;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

describe('<ComponentTemplateList />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: ComponentTemplateListTestBed;

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup();
    });

    testBed.component.update();
  });

  describe('With component templates', () => {
    const componentTemplate1: ComponentTemplateListItem = {
      name: 'test_component_template_1',
      hasMappings: true,
      hasAliases: true,
      hasSettings: true,
      usedBy: [],
    };

    const componentTemplate2: ComponentTemplateListItem = {
      name: 'test_component_template_2',
      hasMappings: true,
      hasAliases: true,
      hasSettings: true,
      usedBy: ['test_index_template_1'],
    };

    const componentTemplates = [componentTemplate1, componentTemplate2];

    httpRequestsMockHelpers.setLoadComponentTemplatesResponse(componentTemplates);

    test('should render the list view', async () => {
      const { table } = testBed;

      // Verify table content
      const { tableCellsValues } = table.getMetaData('componentTemplatesTable');
      tableCellsValues.forEach((row, i) => {
        const { name, usedBy } = componentTemplates[i];
        const usedByText = usedBy.length === 0 ? 'Not in use' : usedBy.length.toString();

        expect(row).toEqual(['', name, usedByText, '', '', '', '']);
      });
    });

    test('should reload the component templates data', async () => {
      const { component, actions } = testBed;
      const totalRequests = server.requests.length;

      await act(async () => {
        actions.clickReloadButton();
      });

      component.update();

      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(
        `${API_BASE_PATH}/component_templates`
      );
    });

    test('should delete a component template', async () => {
      const { actions, component } = testBed;
      const { name: componentTemplateName } = componentTemplate1;

      await act(async () => {
        actions.clickDeleteActionAt(0);
      });

      // We need to read the document "body" as the modal is added there and not inside
      // the component DOM tree.
      const modal = document.body.querySelector(
        '[data-test-subj="deleteComponentTemplatesConfirmation"]'
      );
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      expect(modal).not.toBe(null);
      expect(modal!.textContent).toContain('Delete component template');

      httpRequestsMockHelpers.setDeleteComponentTemplateResponse({
        itemsDeleted: [componentTemplateName],
        errors: [],
      });

      await act(async () => {
        confirmButton!.click();
      });

      component.update();

      const deleteRequest = server.requests[server.requests.length - 2];

      expect(deleteRequest.method).toBe('DELETE');
      expect(deleteRequest.url).toBe(
        `${API_BASE_PATH}/component_templates/${componentTemplateName}`
      );
      expect(deleteRequest.status).toEqual(200);
    });
  });

  describe('No component templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);

      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    test('should display an empty prompt', async () => {
      const { exists, find } = testBed;

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyList')).toBe(true);
      expect(find('emptyList.title').text()).toEqual('Start by creating a component template');
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      const error = {
        status: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadComponentTemplatesResponse(undefined, { body: error });

      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    test('should render an error message if error fetching component templates', async () => {
      const { exists, find } = testBed;

      expect(exists('componentTemplatesLoadError')).toBe(true);
      expect(find('componentTemplatesLoadError').text()).toContain(
        'Unable to load component templates. Try again.'
      );
    });
  });
});
