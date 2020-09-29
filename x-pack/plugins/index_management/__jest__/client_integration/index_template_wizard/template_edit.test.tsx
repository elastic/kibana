/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import * as fixtures from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';

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

describe('<TemplateEdit />', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
  });

  afterAll(() => {
    server.restore();
    jest.useRealTimers();
  });

  describe('without mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse(templateToEdit);
    });

    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    it('allows you to add mappings', async () => {
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

    it('allows you to save an unmodified template', async () => {
      const { actions } = testBed;
      // Logistics
      await actions.completeStepOne();
      // Component templates
      await actions.completeStepTwo();
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

      const latestRequest = server.requests[server.requests.length - 1];
      const { version } = templateToEdit;

      const expected = {
        name: 'index_template_without_mappings',
        indexPatterns: ['indexPattern1'],
        version,
        _kbnMeta: {
          type: 'default',
          isLegacy: templateToEdit._kbnMeta.isLegacy,
          hasDatastream: false,
        },
      };

      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });

    it('allows you to view the "Request" tab of an unmodified template', async () => {
      const { actions, exists } = testBed;

      // Logistics
      await actions.completeStepOne();
      // Component templates
      await actions.completeStepTwo();
      // Index settings
      await actions.completeStepThree();
      // Mappings
      await actions.completeStepFour();
      // Aliases
      await actions.completeStepFive();

      await actions.review.selectTab('request');

      expect(exists('requestTab')).toBe(true);
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
      httpRequestsMockHelpers.setLoadTemplateResponse(templateToEdit);
    });

    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
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

        const latestRequest = server.requests[server.requests.length - 1];
        const { version } = templateToEdit;

        const expected = {
          name: TEMPLATE_NAME,
          version,
          priority: 3,
          indexPatterns: UPDATED_INDEX_PATTERN,
          template: {
            mappings: {
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
            hasDatastream: false,
          },
        };

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });
    });
  });
});
