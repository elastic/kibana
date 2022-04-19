/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import '@kbn/es-ui-shared-plugin/public/components/code_editor/jest_mock';
import '../../../../../../test/global_mocks';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import { setup, ComponentTemplateCreateTestBed } from './helpers/component_template_create.helpers';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
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

describe('<ComponentTemplateCreate />', () => {
  let testBed: ComponentTemplateCreateTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  describe('On component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should set the correct page header', async () => {
      const { exists, find } = testBed;

      // Verify page title
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create component template');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Component Templates docs');
    });

    describe('Step: Logistics', () => {
      test('should toggle the metadata field', async () => {
        const { exists, component, actions } = testBed;

        // Meta editor should be hidden by default
        // Since the editor itself is mocked, we checked for the mocked element
        expect(exists('metaEditor')).toBe(false);

        await act(async () => {
          actions.toggleMetaSwitch();
        });

        component.update();

        expect(exists('metaEditor')).toBe(true);
      });

      describe('Validation', () => {
        test('should require a name', async () => {
          const { form, actions, component, find } = testBed;

          await act(async () => {
            // Submit logistics step without any values
            actions.clickNextButton();
          });

          component.update();

          // Verify name is required
          expect(form.getErrorsMessages()).toEqual(['A component template name is required.']);
          expect(find('nextButton').props().disabled).toEqual(true);
        });
      });
    });

    describe('Step: Review and submit', () => {
      const COMPONENT_TEMPLATE_NAME = 'comp-1';
      const SETTINGS = { number_of_shards: 1 };
      const ALIASES = { my_alias: {} };

      const BOOLEAN_MAPPING_FIELD = {
        name: 'boolean_datatype',
        type: 'boolean',
      };

      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        const { actions, component } = testBed;

        component.update();

        // Complete step 1 (logistics)
        await actions.completeStepLogistics({ name: COMPONENT_TEMPLATE_NAME });

        // Complete step 2 (index settings)
        await actions.completeStepSettings(SETTINGS);

        // Complete step 3 (mappings)
        await actions.completeStepMappings([BOOLEAN_MAPPING_FIELD]);

        // Complete step 4 (aliases)
        await actions.completeStepAliases(ALIASES);
      });

      test('should render the review content', () => {
        const { find, exists, actions } = testBed;
        // Verify page header
        expect(exists('stepReview')).toBe(true);
        expect(find('stepReview.title').text()).toEqual(
          `Review details for '${COMPONENT_TEMPLATE_NAME}'`
        );

        // Verify 2 tabs exist
        expect(find('stepReview.content').find('.euiTab').length).toBe(2);
        expect(
          find('stepReview.content')
            .find('.euiTab')
            .map((t) => t.text())
        ).toEqual(['Summary', 'Request']);

        // Summary tab should render by default
        expect(exists('stepReview.summaryTab')).toBe(true);
        expect(exists('stepReview.requestTab')).toBe(false);

        // Navigate to request tab and verify content
        actions.selectReviewTab('request');

        expect(exists('stepReview.summaryTab')).toBe(false);
        expect(exists('stepReview.requestTab')).toBe(true);
      });

      test('should send the correct payload when submitting the form', async () => {
        const { actions, component } = testBed;

        await act(async () => {
          actions.clickNextButton();
        });

        component.update();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              name: COMPONENT_TEMPLATE_NAME,
              template: {
                settings: SETTINGS,
                mappings: {
                  properties: {
                    [BOOLEAN_MAPPING_FIELD.name]: {
                      type: BOOLEAN_MAPPING_FIELD.type,
                    },
                  },
                },
                aliases: ALIASES,
              },
              _kbnMeta: { usedBy: [], isManaged: false },
            }),
          })
        );
      });

      test('should surface API errors if the request is unsuccessful', async () => {
        const { component, actions, find, exists } = testBed;

        const error = {
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a template with name '${COMPONENT_TEMPLATE_NAME}'`,
        };

        httpRequestsMockHelpers.setCreateComponentTemplateResponse(undefined, error);

        await act(async () => {
          actions.clickNextButton();
        });

        component.update();

        expect(exists('saveComponentTemplateError')).toBe(true);
        expect(find('saveComponentTemplateError').text()).toContain(error.message);
      });
    });
  });
});
