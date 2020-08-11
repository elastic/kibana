/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import * as fixtures from '../../../test/fixtures';
import { setupEnvironment, nextTick } from '../helpers';

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
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj="mockCodeEditor"
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

// FLAKY: https://github.com/elastic/kibana/issues/65567
describe.skip('<TemplateEdit />', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('without mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      isLegacy: true,
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadTemplateResponse(templateToEdit);

      testBed = await setup();

      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    it('allows you to add mappings', async () => {
      const { actions, find } = testBed;

      await act(async () => {
        // Complete step 1 (logistics)
        await actions.completeStepOne();

        // Step 2 (index settings)
        await actions.completeStepTwo();

        // Step 3 (mappings)
        await act(async () => {
          await actions.addMappingField('field_1', 'text');
        });

        expect(find('fieldsListItem').length).toBe(1);
      });
    });
  });

  describe('with mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: TEMPLATE_NAME,
      indexPatterns: ['indexPattern1'],
      template: {
        mappings: MAPPING,
      },
      isLegacy: true,
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadTemplateResponse(templateToEdit);

      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');
      });
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

        await act(async () => {
          // Complete step 1 (logistics)
          await actions.completeStepOne({
            indexPatterns: UPDATED_INDEX_PATTERN,
          });

          // Step 2 (index settings)
          await actions.completeStepTwo(JSON.stringify(SETTINGS));
        });
      });

      it('should send the correct payload with changed values', async () => {
        const { actions, component, find, form } = testBed;

        await act(async () => {
          // Make some changes to the mappings (step 3)

          actions.clickEditButtonAtField(0); // Select the first field to edit
          await nextTick();
          component.update();
        });

        // verify edit field flyout
        expect(find('mappingsEditorFieldEdit').length).toEqual(1);

        await act(async () => {
          // change the field name
          form.setInputValue('nameParameterInput', UPDATED_MAPPING_TEXT_FIELD_NAME);

          // Save changes
          actions.clickEditFieldUpdateButton();
          await nextTick();
          component.update();

          // Proceed to the next step
          actions.clickNextButton();
          await nextTick(50);
          component.update();

          // Step 4 (aliases)
          await actions.completeStepFour(JSON.stringify(ALIASES));

          // Submit the form
          actions.clickSubmitButton();
          await nextTick();
        });

        const latestRequest = server.requests[server.requests.length - 1];
        const { version, order } = templateToEdit;

        const expected = {
          name: TEMPLATE_NAME,
          version,
          order,
          indexPatterns: UPDATED_INDEX_PATTERN,
          template: {
            mappings: {
              ...MAPPING,
              properties: {
                [UPDATED_MAPPING_TEXT_FIELD_NAME]: {
                  type: 'text',
                  store: false,
                  index: true,
                  fielddata: false,
                  eager_global_ordinals: false,
                  index_phrases: false,
                  norms: true,
                  index_options: 'positions',
                },
              },
            },
            settings: SETTINGS,
            aliases: ALIASES,
          },
          _kbnMeta: {
            type: 'default',
            isLegacy: templateToEdit._kbnMeta.isLegacy,
          },
        };

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });
    });
  });
});
