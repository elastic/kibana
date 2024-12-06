/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import {
  getMatchingIndices,
  getFieldsFromIndices,
  getMatchingDataStreams,
} from '../helpers/fixtures';
import { CreateEnrichPoliciesTestBed, setup } from './create_enrich_policy.helpers';
import { getESPolicyCreationApiCall } from '../../../common/lib';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // Mock EuiComboBox as a simple input instead so that its easier to test
    EuiComboBox: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockEuiCombobox'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.target.value.split(', '));
        }}
      />
    ),
  };
});

describe('Create enrich policy', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: CreateEnrichPoliciesTestBed;

  beforeEach(async () => {
    httpRequestsMockHelpers.setGetMatchingIndices(getMatchingIndices());
    httpRequestsMockHelpers.setGetMatchingDataStreams(getMatchingDataStreams());

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  test('Has header and docs link', async () => {
    const { exists, component } = testBed;
    component.update();

    expect(exists('createEnrichPolicyHeaderContent')).toBe(true);
    expect(exists('createEnrichPolicyDocumentationLink')).toBe(true);
  });

  describe('Configuration step', () => {
    it('Fields have helpers', async () => {
      const { exists } = testBed;

      expect(exists('typePopoverIcon')).toBe(true);
      expect(exists('uploadFileLink')).toBe(true);
      expect(exists('matchAllQueryLink')).toBe(true);
    });

    it('shows validation errors if form isnt filled', async () => {
      await testBed.actions.clickNextButton();

      expect(testBed.form.getErrorsMessages()).toHaveLength(3);
    });

    it('Allows to submit the form when fields are filled', async () => {
      const { actions } = testBed;

      await testBed.actions.completeConfigurationStep({});

      expect(actions.isOnFieldSelectionStep()).toBe(true);
    });
  });

  describe('Fields selection step', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();

      await testBed.actions.completeConfigurationStep({});
    });

    it('shows validation errors if form isnt filled', async () => {
      await testBed.actions.clickNextButton();

      expect(testBed.form.getErrorsMessages()).toHaveLength(2);
    });

    it('Allows to submit the form when fields are filled', async () => {
      const { form, actions } = testBed;

      form.setSelectValue('matchField', 'name');
      form.setSelectValue('enrichFields', 'email');

      await testBed.actions.clickNextButton();

      expect(actions.isOnCreateStep()).toBe(true);
    });

    it('When no common fields are returned it shows an error callout', async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices({
        commonFields: [],
        indices: [],
      });

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();

      await testBed.actions.completeConfigurationStep({ indices: 'test-1, test-2' });

      expect(testBed.exists('noCommonFieldsError')).toBe(true);
    });
  });

  describe('Creation step', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();

      await testBed.actions.completeConfigurationStep({});
      await testBed.actions.completeFieldsSelectionStep();
    });

    it('Shows CTAs for creating the policy', async () => {
      const { exists } = testBed;

      expect(exists('createButton')).toBe(true);
      expect(exists('createAndExecuteButton')).toBe(true);
    });

    it('Shows policy summary and request', async () => {
      const { find } = testBed;

      expect(find('enrichPolicySummaryList').text()).toContain('test_policy');

      await testBed.actions.clickRequestTab();

      expect(find('requestBody').text()).toContain(getESPolicyCreationApiCall('test_policy'));
    });

    it('Shows error message when creating the policy fails', async () => {
      const { exists, actions } = testBed;
      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'something went wrong...',
      };

      httpRequestsMockHelpers.setCreateEnrichPolicy(undefined, error);

      await actions.clickCreatePolicy();

      expect(exists('errorWhenCreatingCallout')).toBe(true);
    });
  });

  it('Can navigate back and forth with next/back buttons', async () => {
    httpRequestsMockHelpers.setGetFieldsFromIndices(getFieldsFromIndices());

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    const { component, actions } = testBed;
    component.update();

    // Navigate to create step
    await actions.completeConfigurationStep({});
    await actions.completeFieldsSelectionStep();

    // Clicking back button should take us to fields selection step
    await actions.clickBackButton();
    expect(actions.isOnFieldSelectionStep()).toBe(true);

    // Clicking back button should take us to configuration step
    await actions.clickBackButton();
    expect(actions.isOnConfigurationStep()).toBe(true);
  });
});
