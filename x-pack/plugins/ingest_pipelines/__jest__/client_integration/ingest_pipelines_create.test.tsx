/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers, nextTick } from './helpers';
import { PipelinesCreateTestBed } from './helpers/pipelines_create.helpers';

import { nestedProcessorsErrorFixture } from './fixtures';

const { setup } = pageHelpers.pipelinesCreate;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

describe('<PipelinesCreate />', () => {
  let testBed: PipelinesCreateTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup();
        await testBed.waitFor('pipelineForm');
      });
    });

    test('should render the correct page header', () => {
      const { exists, find } = testBed;

      // Verify page title
      expect(exists('pageTitle')).toBe(true);
      expect(find('pageTitle').text()).toEqual('Create pipeline');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Create pipeline docs');
    });

    test('should toggle the version field', async () => {
      const { actions, component, exists } = testBed;

      // Version field should be hidden by default
      expect(exists('versionField')).toBe(false);

      await act(async () => {
        actions.toggleVersionSwitch();
        await nextTick();
        component.update();
      });

      expect(exists('versionField')).toBe(true);
    });

    test('should show the request flyout', async () => {
      const { actions, component, find, exists } = testBed;

      await act(async () => {
        actions.clickShowRequestLink();
        await nextTick();
        component.update();
      });

      // Verify request flyout opens
      expect(exists('requestFlyout')).toBe(true);
      expect(find('requestFlyout.title').text()).toBe('Request');
    });

    describe('form validation', () => {
      test('should prevent form submission if required fields are missing', async () => {
        const { form, actions, component, find } = testBed;

        await act(async () => {
          actions.clickSubmitButton();
          await nextTick();
          component.update();
        });

        expect(form.getErrorsMessages()).toEqual(['Name is required.']);
        expect(find('submitButton').props().disabled).toEqual(true);

        // Add required fields and verify button is enabled again
        form.setInputValue('nameField.input', 'my_pipeline');

        await act(async () => {
          await nextTick();
          component.update();
        });

        expect(find('submitButton').props().disabled).toEqual(false);
      });
    });

    describe('form submission', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup();

          const { waitFor, form } = testBed;

          await waitFor('pipelineForm');

          form.setInputValue('nameField.input', 'my_pipeline');
          form.setInputValue('descriptionField.input', 'pipeline description');
        });
      });

      test('should send the correct payload', async () => {
        const { actions, waitFor } = testBed;

        await act(async () => {
          actions.clickSubmitButton();
          await waitFor('pipelineForm', 0);
        });

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          name: 'my_pipeline',
          description: 'pipeline description',
          processors: [],
        };

        expect(JSON.parse(latestRequest.requestBody)).toEqual(expected);
      });

      test('should surface API errors from the request', async () => {
        const { actions, find, exists, waitFor } = testBed;

        const error = {
          status: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name 'my_pipeline'.`,
        };

        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, { body: error });

        await act(async () => {
          actions.clickSubmitButton();
          await waitFor('savePipelineError');
        });

        expect(exists('savePipelineError')).toBe(true);
        expect(find('savePipelineError').text()).toContain(error.message);
      });

      test('displays nested pipeline errors as a flat list', async () => {
        const { actions, find, exists, waitFor } = testBed;
        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, {
          body: nestedProcessorsErrorFixture,
        });

        await act(async () => {
          actions.clickSubmitButton();
          await waitFor('savePipelineError');
        });

        expect(exists('savePipelineError')).toBe(true);
        expect(exists('savePipelineError.showErrorsButton')).toBe(true);
        find('savePipelineError.showErrorsButton').simulate('click');
        expect(exists('savePipelineError.hideErrorsButton')).toBe(true);
        expect(exists('savePipelineError.showErrorsButton')).toBe(false);
        expect(find('savePipelineError').find('li').length).toBe(8);
      });
    });

    describe('test pipeline', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup();

          const { waitFor } = testBed;

          await waitFor('pipelineForm');
        });
      });

      test('should open the test pipeline flyout', async () => {
        const { actions, exists, find, waitFor } = testBed;

        await act(async () => {
          actions.clickTestPipelineButton();
          await waitFor('testPipelineFlyout');
        });

        // Verify test pipeline flyout opens
        expect(exists('testPipelineFlyout')).toBe(true);
        expect(find('testPipelineFlyout.title').text()).toBe('Test pipeline');
      });
    });
  });
});
