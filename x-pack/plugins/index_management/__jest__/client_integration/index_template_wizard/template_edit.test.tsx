/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import '../../../test/global_mocks';
import * as fixtures from '../../../test/fixtures';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, kibanaVersion } from '../helpers';

import { TEMPLATE_NAME, SETTINGS, ALIASES, MAPPINGS as DEFAULT_MAPPING } from './constants';
import { setup } from './template_edit.helpers';
import { TemplateFormTestBed } from './template_form.helpers';

const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];
const UPDATED_MAPPING_TEXT_FIELD_NAME = 'updated_text_datatype';
const MAPPING = {
  ...DEFAULT_MAPPING,
  properties: {
    text_datatype: {
      type: 'text',
    },
  },
};

jest.mock('@elastic/eui', () => {
  const origial = jest.requireActual('@elastic/eui');

  return {
    ...origial,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj="mockComboBox"
        onChange={(syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});

describe('<TemplateEdit />', () => {
  let testBed: TemplateFormTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('without mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {
        hidden: true,
        anyUnknownKey: 'should_be_kept',
      },
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
    });

    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('allows you to add mappings', async () => {
      const { actions, find } = testBed;
      // Logistics
      await actions.completeStepOne();
      // Component templates
      await actions.completeStepTwo();
      // Index settings
      await actions.completeStepThree();
      // Mappings
      await actions.mappings.addField('field_1', 'text');

      expect(find('fieldsListItem').length).toBe(1);
    });

    test('should keep data stream configuration', async () => {
      const { actions } = testBed;
      // Logistics
      await actions.completeStepOne({
        name: 'test',
        indexPatterns: ['myPattern*'],
        version: 1,
      });
      // Component templates
      await actions.completeStepTwo();
      // Index settings
      await actions.completeStepThree();
      // Mappings
      await actions.completeStepFour();
      // Aliases
      await actions.completeStepFive();

      await act(async () => {
        actions.clickNextButton();
      });

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/index_templates/test`,
        expect.objectContaining({ body: JSON.stringify({
          name: 'test',
          indexPatterns: ['myPattern*'],
          version: 1,
          dataStream: {
            hidden: true,
            anyUnknownKey: 'should_be_kept',
          },
          _kbnMeta: {
            type: 'default',
            hasDatastream: true,
            isLegacy: false,
          },
        })})
      );
    });
  });

  describe('with mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: TEMPLATE_NAME,
      indexPatterns: ['indexPattern1'],
      template: {
        mappings: MAPPING,
      },
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
    });

    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup)
      });
      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;
      const { name } = templateToEdit;

      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual(`Edit template '${name}'`);
    });

    it('should set the nameField to readOnly', () => {
      const { find } = testBed;

      const nameInput = find('nameField.input');
      expect(nameInput.props().disabled).toEqual(true);
    });

    describe('form payload', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        // Logistics
        await actions.completeStepOne({
          indexPatterns: UPDATED_INDEX_PATTERN,
          priority: 3,
        });
        // Component templates
        await actions.completeStepTwo();
        // Index settings
        await actions.completeStepThree(JSON.stringify(SETTINGS));
      });

      it('should send the correct payload with changed values', async () => {
        const { actions, component, exists, form } = testBed;

        // Make some changes to the mappings
        await act(async () => {
          actions.clickEditButtonAtField(0); // Select the first field to edit
        });
        component.update();

        // Verify that the edit field flyout is opened
        expect(exists('mappingsEditorFieldEdit')).toBe(true);

        // Change the field name
        await act(async () => {
          form.setInputValue('nameParameterInput', UPDATED_MAPPING_TEXT_FIELD_NAME);
        });

        // Save changes on the field
        await act(async () => {
          actions.clickEditFieldUpdateButton();
        });
        component.update();

        // Proceed to the next step
        await act(async () => {
          actions.clickNextButton();
        });
        component.update();

        // Aliases
        await actions.completeStepFive(JSON.stringify(ALIASES));

        // Submit the form
        await act(async () => {
          actions.clickNextButton();
        });

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
          expect.objectContaining({ body: JSON.stringify({
            name: TEMPLATE_NAME,
            indexPatterns: UPDATED_INDEX_PATTERN,
            priority: 3,
            version: templateToEdit.version,
            _kbnMeta: {
              type: 'default',
              hasDatastream: false,
              isLegacy: templateToEdit._kbnMeta.isLegacy,
            },
            template: {
              settings: SETTINGS,
              mappings: {
                properties: {
                  [UPDATED_MAPPING_TEXT_FIELD_NAME]: {
                    type: 'text',
                    index: true,
                    eager_global_ordinals: false,
                    index_phrases: false,
                    norms: true,
                    fielddata: false,
                    store: false,
                    index_options: 'positions',
                  },
                },
              },
              aliases: ALIASES,
            },
          })})
        );
      });
    });
  });

  if (kibanaVersion.major < 8) {
    describe('legacy index templates', () => {
      const legacyTemplateToEdit = fixtures.getTemplate({
        name: 'legacy_index_template',
        indexPatterns: ['indexPattern1'],
        isLegacy: true,
        template: {
          mappings: {
            my_mapping_type: {},
          },
        },
      });

      beforeAll(() => {
        httpRequestsMockHelpers.setLoadTemplateResponse('my_template', legacyTemplateToEdit);
      });

      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();
      });

      it('persists mappings type', async () => {
        const { actions } = testBed;
        // Logistics
        await actions.completeStepOne();
        // Note: "step 2" (component templates) doesn't exist for legacy templates
        // Index settings
        await actions.completeStepThree();
        // Mappings
        await actions.completeStepFour();
        // Aliases
        await actions.completeStepFive();

        // Submit the form
        await act(async () => {
          actions.clickNextButton();
        });

        const { version, template, name, indexPatterns, _kbnMeta, order } = legacyTemplateToEdit;

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
          expect.objectContaining({ body: JSON.stringify({
            name,
            indexPatterns,
            version,
            order,
            template: {
              aliases: undefined,
              mappings: template!.mappings,
              settings: undefined,
            },
            _kbnMeta,
          })})
        );
      });
    });
  }
});
