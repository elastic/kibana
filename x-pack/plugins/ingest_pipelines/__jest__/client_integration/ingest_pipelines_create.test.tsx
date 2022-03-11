/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
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
      });

      testBed.component.update();
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
      const { actions, exists } = testBed;

      // Version field should be hidden by default
      expect(exists('versionField')).toBe(false);

      actions.toggleVersionSwitch();

      expect(exists('versionField')).toBe(true);
    });

    test('should show the request flyout', async () => {
      const { actions, find, exists } = testBed;

      await actions.clickShowRequestLink();

      // Verify request flyout opens
      expect(exists('apiRequestFlyout')).toBe(true);
      expect(find('apiRequestFlyout.apiRequestFlyoutTitle').text()).toBe('Request');
    });

    describe('form validation', () => {
      test('should prevent form submission if required fields are missing', async () => {
        const { form, actions, component, find } = testBed;

        await actions.clickSubmitButton();

        expect(form.getErrorsMessages()).toEqual(['Name is required.']);
        expect(find('submitButton').props().disabled).toEqual(true);

        await act(async () => {
          // Add required fields and verify button is enabled again
          form.setInputValue('nameField.input', 'my_pipeline');
        });

        component.update();

        expect(find('submitButton').props().disabled).toEqual(false);
      });
    });

    describe('form submission', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup();
        });

        testBed.component.update();

        await act(async () => {
          testBed.form.setInputValue('nameField.input', 'my_pipeline');
        });

        testBed.component.update();

        await act(async () => {
          testBed.form.setInputValue('descriptionField.input', 'pipeline description');
        });

        testBed.component.update();
      });

      test('should send the correct payload', async () => {
        const { actions } = testBed;

        await actions.clickSubmitButton();

        const latestRequest = server.requests[server.requests.length - 1];

        const expected = {
          name: 'my_pipeline',
          description: 'pipeline description',
          processors: [],
        };

        expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
      });

      test('should surface API errors from the request', async () => {
        const { actions, find, exists } = testBed;

        const error = {
          status: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name 'my_pipeline'.`,
        };

        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, { body: error });

        await actions.clickSubmitButton();

        expect(exists('savePipelineError')).toBe(true);
        expect(find('savePipelineError').text()).toContain(error.message);
      });

      test('displays nested pipeline errors as a flat list', async () => {
        const { actions, find, exists, component } = testBed;
        httpRequestsMockHelpers.setCreatePipelineResponse(undefined, {
          body: nestedProcessorsErrorFixture,
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
