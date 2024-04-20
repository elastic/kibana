/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
import { API_BASE_PATH } from '../../common/constants';
import { PipelinesCreateTestBed } from './helpers/pipelines_create.helpers';

import { nestedProcessorsErrorFixture } from './fixtures';

const { setup } = pageHelpers.pipelinesCreate;

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
        }}
      />
    ),
  };
});

describe('<PipelinesCreate />', () => {
  let testBed: PipelinesCreateTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  describe('on component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should render the correct page header', () => {
      const { exists, find } = testBed;

      // Verify pipeline name is visible
      expect(exists('pipelineName')).toBe(true);

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Documentation');
    });

    test('should toggle the version field', async () => {
      const { actions, exists } = testBed;

      // Version field should be hidden by default
      expect(exists('versionField')).toBe(false);

      actions.toggleVersionSwitch();

      expect(exists('versionField')).toBe(true);
    });

    test('should toggle the _meta field', async () => {
      const { exists, component, actions } = testBed;

      // Meta editor should be hidden by default
      expect(exists('metaEditor')).toBe(false);

      await act(async () => {
        actions.toggleMetaSwitch();
      });

      component.update();

      expect(exists('metaEditor')).toBe(true);
    });

    test('should show the request flyout', async () => {
      const { actions, find, exists } = testBed;

      await actions.clickShowRequestLink();

      // Verify request flyout opens
      expect(exists('apiRequestFlyout')).toBe(true);
      expect(find('apiRequestFlyout.apiRequestFlyoutTitle').text()).toBe('Request');
    });

    test('should allow to prepopulate the name field', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, '?name=test-pipeline');
      });

      testBed.component.update();

      expect(testBed.exists('pipelineName')).toBe(true);
      expect(testBed.find('pipelineName').text()).toContain('test-pipeline');
      // if the inline title edit has an svg
      expect(testBed.exists('pipelineName > svg')).toBe(false);
    });

    describe('form validation', () => {
      test('should prevent form submission if required fields are missing', async () => {
        const { actions, component, find } = testBed;

        await actions.clickSubmitButton();

        // There doesnt seem to be a prop we can send to the form to set a data-test-subj
        // for the error callout, so we manually select it from the form.
        const errorCallout = component.find('.euiForm__errors').at(0);
        expect(errorCallout.text()).toContain('Please address the highlighted errors.');
        expect(errorCallout.text()).toContain('Name is required.');

        await actions.setInlineEditValue('pipelineName', 'my_pipeline');

        expect(find('submitButton').props().disabled).toEqual(false);
      });
    });

    describe('form submission', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();

        await testBed.actions.setInlineEditValue('pipelineName', 'my_pipeline');
        await testBed.actions.setInlineEditValue('pipelineDescription', 'pipeline description');
      });

      test('should send the correct payload', async () => {
        const { component, actions } = testBed;

        await act(async () => {
          actions.toggleMetaSwitch();
        });
        component.update();
        const metaData = {
          field1: 'hello',
          field2: 10,
        };
        await act(async () => {
          actions.setMetaField(metaData);
        });

        await actions.clickSubmitButton();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          API_BASE_PATH,
          expect.objectContaining({
            body: JSON.stringify({
              name: 'my_pipeline',
              description: 'pipeline description',
              _meta: metaData,
              processors: [],
            }),
          })
        );
      });

      test('should surface API errors from the request', async () => {
        const { actions, find, exists } = testBed;

        const error = {
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name 'my_pipeline'.`,
        };

        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, error);

        await actions.clickSubmitButton();

        expect(exists('savePipelineError')).toBe(true);
        expect(find('savePipelineError').text()).toContain(error.message);
      });

      test('displays nested pipeline errors as a flat list', async () => {
        const { actions, find, exists, component } = testBed;
        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, {
          statusCode: 409,
          message: 'Error',
          ...nestedProcessorsErrorFixture,
        });

        await actions.clickSubmitButton();

        expect(exists('savePipelineError')).toBe(true);
        expect(exists('savePipelineError.showErrorsButton')).toBe(true);

        await act(async () => {
          find('savePipelineError.showErrorsButton').simulate('click');
        });

        component.update();

        expect(exists('savePipelineError.hideErrorsButton')).toBe(true);
        expect(exists('savePipelineError.showErrorsButton')).toBe(false);
        expect(find('savePipelineError').find('li').length).toBe(8);
      });
    });
  });
});
