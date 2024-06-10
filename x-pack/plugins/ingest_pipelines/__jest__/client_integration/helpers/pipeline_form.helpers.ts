/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { TestBed } from '@kbn/test-jest-helpers';

export const getFormActions = (testBed: TestBed) => {
  const { find, form, component } = testBed;

  // User actions
  const clickSubmitButton = async () => {
    await act(async () => {
      find('submitButton').simulate('click');
    });

    component.update();
  };

  const clickShowRequestLink = async () => {
    await act(async () => {
      find('showRequestLink').simulate('click');
    });

    component.update();
  };

  const toggleSwitch = async (testSubject: string) => {
    await act(async () => {
      form.toggleEuiSwitch(testSubject);
    });

    component.update();
  };

  const getToggleValue = (testSubject: string): boolean =>
    find(testSubject).props()['aria-checked'];

  const setMetaField = (value: object) => {
    find('metaEditor').getDOMNode().setAttribute('data-currentvalue', JSON.stringify(value));
    find('metaEditor').simulate('change');
  };

  return {
    getToggleValue,
    clickSubmitButton,
    clickShowRequestLink,
    toggleSwitch,
    setMetaField,
  };
};

export type PipelineFormTestSubjects =
  | 'addDocumentsButton'
  | 'submitButton'
  | 'pageTitle'
  | 'savePipelineError'
  | 'savePipelineError.showErrorsButton'
  | 'savePipelineError.hideErrorsButton'
  | 'pipelineForm'
  | 'versionToggle'
  | 'versionField'
  | 'metaToggle'
  | 'metaEditor'
  | 'nameField.input'
  | 'descriptionField.input'
  | 'processorsEditor'
  | 'onFailureToggle'
  | 'onFailureEditor'
  | 'testPipelineButton'
  | 'showRequestLink'
  | 'apiRequestFlyout'
  | 'apiRequestFlyout.apiRequestFlyoutTitle'
  | 'deprecatedPipelineCallout'
  | 'testPipelineFlyout'
  | 'testPipelineFlyout.title'
  | 'documentationLink';
