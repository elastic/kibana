/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { setupEnvironment } from '../helpers';
import { getMatchingIndices } from '../helpers/fixtures';
import { CreateEnrichPoliciesTestBed, setup } from './create_enrich_policy.helpers';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
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

    testBed = await setup(httpSetup);
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
      const { form, actions } = testBed;

      form.setInputValue('policyNameField.input', 'test_policy');
      form.setSelectValue('policyTypeField', 'match');
      form.setSelectValue('policySourceIndicesField', 'test-1');

      await testBed.actions.clickNextButton();

      expect(actions.isOnFieldSelectionStep()).toBe(true);
    });
  });

  describe('Fields selection step', () => {
    beforeEach(async () => {
      testBed = await setup(httpSetup);
      testBed.component.update();

      const { form, actions } = testBed;

      form.setInputValue('policyNameField.input', 'test_policy');
      form.setSelectValue('policyTypeField', 'match');
      form.setSelectValue('policySourceIndicesField', 'test-1');

      // console.log(testBed.form.getErrorsMessages());
      await actions.clickNextButton();
    });

    it('Fields have helpers', async () => {
      const { actions, exists } = testBed;

      console.log(testBed.component.debug());

      expect(actions.isOnFieldSelectionStep()).toBe(true);
      expect(exists('enrichFieldsPopover')).toBe(true);
      expect(exists('matchFieldPopover')).toBe(true);
    });

    it('shows validation errors if form isnt filled', async () => {
      await testBed.actions.clickNextButton();

      expect(testBed.form.getErrorsMessages()).toHaveLength(2);
    });

    it.skip('Allows to submit the form when fields are filled', async () => {
      const { form, actions } = testBed;

      form.setSelectValue('policyTypeField', 'match');
      form.setSelectValue('policySourceIndicesField', 'test-1');

      await testBed.actions.clickNextButton();

      expect(actions.isOnFieldSelectionStep()).toBe(true);
    });
  });
});
