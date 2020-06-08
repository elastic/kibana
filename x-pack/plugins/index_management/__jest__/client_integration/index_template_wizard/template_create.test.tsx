/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { CREATE_LEGACY_TEMPLATE_BY_DEFAULT } from '../../../common';
import { setupEnvironment, nextTick } from '../helpers';

import {
  TEMPLATE_NAME,
  SETTINGS,
  MAPPINGS,
  ALIASES,
  INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS,
} from './constants';
import { setup } from './template_create.helpers';
import { TemplateFormTestBed } from './template_form.helpers';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
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
}));

const TEXT_MAPPING_FIELD = {
  name: 'text_datatype',
  type: 'text',
};

const BOOLEAN_MAPPING_FIELD = {
  name: 'boolean_datatype',
  type: 'boolean',
};

const KEYWORD_MAPPING_FIELD = {
  name: 'keyword_datatype',
  type: 'keyword',
};

// FLAKY: https://github.com/elastic/kibana/issues/67833
describe.skip('<TemplateCreate />', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');
      });
    });

    test('should set the correct page title', () => {
      const { exists, find } = testBed;

      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create template');
    });

    test('should not let the user go to the next step with invalid fields', async () => {
      const { find, actions, component } = testBed;

      expect(find('nextButton').props().disabled).toEqual(false);

      await act(async () => {
        actions.clickNextButton();
        await nextTick();
        component.update();
      });

      expect(find('nextButton').props().disabled).toEqual(true);
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');
      });
    });

    describe('index settings (step 2)', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        await act(async () => {
          // Complete step 1 (logistics)
          await actions.completeStepOne({ name: TEMPLATE_NAME, indexPatterns: ['index1'] });
        });
      });

      it('should set the correct page title', () => {
        const { exists, find } = testBed;

        expect(exists('stepSettings')).toBe(true);
        expect(find('stepTitle').text()).toEqual('Index settings (optional)');
      });

      it('should not allow invalid json', async () => {
        const { form, actions } = testBed;

        await act(async () => {
          actions.completeStepTwo('{ invalidJsonString ');
        });

        expect(form.getErrorsMessages()).toContain('Invalid JSON format.');
      });
    });

    describe('mappings (step 3)', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        await act(async () => {
          // Complete step 1 (logistics)
          await actions.completeStepOne({ name: TEMPLATE_NAME, indexPatterns: ['index1'] });

          // Complete step 2 (index settings)
          await actions.completeStepTwo('{}');
        });
      });

      it('should set the correct page title', () => {
        const { exists, find } = testBed;

        expect(exists('stepMappings')).toBe(true);
        expect(find('stepTitle').text()).toEqual('Mappings (optional)');
      });

      it('should allow the user to define document fields for a mapping', async () => {
        const { actions, find } = testBed;

        await act(async () => {
          await actions.addMappingField('field_1', 'text');
          await actions.addMappingField('field_2', 'text');
          await actions.addMappingField('field_3', 'text');
        });

        expect(find('fieldsListItem').length).toBe(3);
      });

      it('should allow the user to remove a document field from a mapping', async () => {
        const { actions, find } = testBed;

        await act(async () => {
          await actions.addMappingField('field_1', 'text');
          await actions.addMappingField('field_2', 'text');
        });

        expect(find('fieldsListItem').length).toBe(2);

        actions.clickCancelCreateFieldButton();
        // Remove first field
        actions.deleteMappingsFieldAt(0);

        expect(find('fieldsListItem').length).toBe(1);
      });
    });

    describe('aliases (step 4)', () => {
      beforeEach(async () => {
        const { actions } = testBed;

        await act(async () => {
          // Complete step 1 (logistics)
          await actions.completeStepOne({ name: TEMPLATE_NAME, indexPatterns: ['index1'] });

          // Complete step 2 (index settings)
          await actions.completeStepTwo('{}');

          // Complete step 3 (mappings)
          await actions.completeStepThree();
        });
      });

      it('should set the correct page title', () => {
        const { exists, find } = testBed;

        expect(exists('stepAliases')).toBe(true);
        expect(find('stepTitle').text()).toEqual('Aliases (optional)');
      });

      it('should not allow invalid json', async () => {
        const { actions, form } = testBed;

        await act(async () => {
          // Complete step 4 (aliases) with invalid json
          await actions.completeStepFour('{ invalidJsonString ', false);
        });

        expect(form.getErrorsMessages()).toContain('Invalid JSON format.');
      });
    });
  });

  describe('review (step 5)', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');

        const { actions } = testBed;

        // Complete step 1 (logistics)
        await actions.completeStepOne({
          name: TEMPLATE_NAME,
          indexPatterns: DEFAULT_INDEX_PATTERNS,
        });

        // Complete step 2 (index settings)
        await actions.completeStepTwo(JSON.stringify(SETTINGS));

        // Complete step 3 (mappings)
        await actions.completeStepThree();

        // Complete step 4 (aliases)
        await actions.completeStepFour(JSON.stringify(ALIASES));
      });
    });

    it('should set the correct step title', () => {
      const { find, exists } = testBed;
      expect(exists('stepSummary')).toBe(true);
      expect(find('stepTitle').text()).toEqual(`Review details for '${TEMPLATE_NAME}'`);
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('summaryTabContent').find('.euiTab').length).toBe(2);
        expect(
          find('summaryTabContent')
            .find('.euiTab')
            .map((t) => t.text())
        ).toEqual(['Summary', 'Request']);
      });

      test('should navigate to the Request tab', async () => {
        const { exists, actions } = testBed;

        expect(exists('summaryTab')).toBe(true);
        expect(exists('requestTab')).toBe(false);

        actions.selectSummaryTab('request');

        expect(exists('summaryTab')).toBe(false);
        expect(exists('requestTab')).toBe(true);
      });
    });

    it('should render a warning message if a wildcard is used as an index pattern', async () => {
      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');

        const { actions } = testBed;
        // Complete step 1 (logistics)
        await actions.completeStepOne({
          name: TEMPLATE_NAME,
          indexPatterns: ['*'], // Set wildcard index pattern
        });

        // Complete step 2 (index settings)
        await actions.completeStepTwo(JSON.stringify({}));

        // Complete step 3 (mappings)
        await actions.completeStepThree();

        // Complete step 4 (aliases)
        await actions.completeStepFour(JSON.stringify({}));
      });

      const { exists, find } = testBed;

      expect(exists('indexPatternsWarning')).toBe(true);
      expect(find('indexPatternsWarningDescription').text()).toEqual(
        'All new indices that you create will use this template. Edit index patterns.'
      );
    });
  });

  describe('form payload & api errors', () => {
    beforeEach(async () => {
      const MAPPING_FIELDS = [BOOLEAN_MAPPING_FIELD, TEXT_MAPPING_FIELD, KEYWORD_MAPPING_FIELD];

      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('templateForm');

        const { actions } = testBed;
        // Complete step 1 (logistics)
        await actions.completeStepOne({
          name: TEMPLATE_NAME,
          indexPatterns: DEFAULT_INDEX_PATTERNS,
        });

        // Complete step 2 (index settings)
        await actions.completeStepTwo(JSON.stringify(SETTINGS));

        // Complete step 3 (mappings)
        await actions.completeStepThree(MAPPING_FIELDS);

        // Complete step 4 (aliases)
        await actions.completeStepFour(JSON.stringify(ALIASES));
      });
    });

    it('should send the correct payload', async () => {
      const { actions } = testBed;

      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
      });

      const latestRequest = server.requests[server.requests.length - 1];

      const expected = {
        name: TEMPLATE_NAME,
        indexPatterns: DEFAULT_INDEX_PATTERNS,
        template: {
          settings: SETTINGS,
          mappings: {
            ...MAPPINGS,
            properties: {
              [BOOLEAN_MAPPING_FIELD.name]: {
                type: BOOLEAN_MAPPING_FIELD.type,
              },
              [TEXT_MAPPING_FIELD.name]: {
                type: TEXT_MAPPING_FIELD.type,
              },
              [KEYWORD_MAPPING_FIELD.name]: {
                type: KEYWORD_MAPPING_FIELD.type,
              },
            },
          },
          aliases: ALIASES,
        },
        _kbnMeta: {
          isLegacy: CREATE_LEGACY_TEMPLATE_BY_DEFAULT,
          isManaged: false,
        },
      };

      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });

    it('should surface the API errors from the put HTTP request', async () => {
      const { component, actions, find, exists } = testBed;

      const error = {
        status: 409,
        error: 'Conflict',
        message: `There is already a template with name '${TEMPLATE_NAME}'`,
      };

      httpRequestsMockHelpers.setCreateTemplateResponse(undefined, { body: error });

      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
        component.update();
      });

      expect(exists('saveTemplateError')).toBe(true);
      expect(find('saveTemplateError').text()).toContain(error.message);
    });
  });
});
