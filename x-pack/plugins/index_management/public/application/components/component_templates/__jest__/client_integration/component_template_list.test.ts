/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { ComponentTemplateListTestBed } from './helpers/component_template_list.helpers';
import { API_BASE_PATH } from '../../../../../../common/constants';

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

  describe('With component templates', () => {
    const componentTemplate1 = {
      name: 'test_component_template_1',
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {
            host_name: {
              type: 'keyword',
            },
          },
        },
      },
      version: 1,
      _kbnMeta: {
        usedBy: [],
      },
    };

    const componentTemplate2 = {
      name: 'test_component_template_2',
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {
            host_name: {
              type: 'keyword',
            },
          },
        },
      },
      _kbnMeta: {
        usedBy: [],
      },
    };

    const componentTemplates = [componentTemplate1, componentTemplate2];

    httpRequestsMockHelpers.setLoadComponentTemplatesResponse(componentTemplates);

    beforeEach(async () => {
      testBed = await setup();

      await act(async () => {
        await nextTick(100); // todo fix
        testBed.component.update();
      });
    });

    test('should render the list view', async () => {
      const { table } = testBed;

      // Verify table content
      const { tableCellsValues } = table.getMetaData('componentTemplatesTable');
      tableCellsValues.forEach((row, i) => {
        const componentTemplate = componentTemplates[i];

        expect(row).toEqual(['', componentTemplate.name, 'Not in use', '', '', '', '']);
      });
    });

    test('should reload the component templates data', async () => {
      const { component, actions } = testBed;
      const totalRequests = server.requests.length;

      await act(async () => {
        actions.clickReloadButton();
        await nextTick(100);
        component.update();
      });

      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(
        `${API_BASE_PATH}/component_templates`
      );
    });

    // test('should show the details of a component template', async () => {
    //   const { find, exists, actions } = testBed;

    //   await actions.clickComponentTemplateAt(0);

    //   expect(exists('componentTemplatesTable')).toBe(true);
    //   expect(exists('componentTemplateDetails')).toBe(true);
    //   expect(find('componentTemplateDetails.title').text()).toBe(componentTemplate1.name);
    // });

    test('should delete a component template', async () => {
      const { actions, component } = testBed;
      const { name: componentTemplateName } = componentTemplate1;

      httpRequestsMockHelpers.setDeleteComponentTemplateResponse({
        itemsDeleted: [componentTemplateName],
        errors: [],
      });

      actions.clickDeleteActionAt(0);

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

      await act(async () => {
        confirmButton!.click();
        await nextTick();
        component.update();
      });

      const latestRequest = server.requests[server.requests.length - 1];

      expect(latestRequest.method).toBe('DELETE');
      expect(latestRequest.url).toBe(
        `${API_BASE_PATH}/component_templates/${componentTemplateName}`
      );
      expect(latestRequest.status).toEqual(200);
    });
  });

  describe('No component templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);

      testBed = await setup();

      await act(async () => {
        const { waitFor } = testBed;

        await waitFor('emptyList');
      });
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

      testBed = await setup();

      await act(async () => {
        const { waitFor } = testBed;

        await waitFor('componentTemplatesLoadError');
      });
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
