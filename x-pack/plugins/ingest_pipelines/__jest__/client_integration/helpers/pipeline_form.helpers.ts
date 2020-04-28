/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestBed, SetupFunc, UnwrapPromise } from '../../../../../test_utils';
import { nextTick } from './index';

export type PipelineFormTestBed = TestBed<PipelineFormTestSubjects> &
  UnwrapPromise<ReturnType<typeof formSetup>>;

export const formSetup = async (initTestBed: SetupFunc<PipelineFormTestSubjects>) => {
  const testBed = await initTestBed();

  // User actions
  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  const clickTestPipelineButton = () => {
    testBed.find('testPipelineButton').simulate('click');
  };

  const clickShowRequestLink = () => {
    testBed.find('showRequestLink').simulate('click');
  };

  const toggleVersionSwitch = () => {
    testBed.form.toggleEuiSwitch('versionToggle');
  };

  const toggleOnFailureSwitch = () => {
    testBed.form.toggleEuiSwitch('onFailureToggle');
  };

  const setEditorInputValue = async (testSubject: PipelineFormTestSubjects, value: string) => {
    testBed.find(testSubject).simulate('change', {
      jsonString: value,
    });
    await nextTick();
    testBed.component.update();
  };

  return {
    ...testBed,
    actions: {
      clickSubmitButton,
      setEditorInputValue,
      clickShowRequestLink,
      toggleVersionSwitch,
      toggleOnFailureSwitch,
      clickTestPipelineButton,
    },
  };
};

export type PipelineFormTestSubjects =
  | 'submitButton'
  | 'pageTitle'
  | 'savePipelineError'
  | 'pipelineForm'
  | 'versionToggle'
  | 'versionField'
  | 'nameField.input'
  | 'descriptionField.input'
  | 'processorsField'
  | 'onFailureToggle'
  | 'onFailureEditor'
  | 'testPipelineButton'
  | 'showRequestLink'
  | 'requestFlyout'
  | 'requestFlyout.title'
  | 'testPipelineFlyout'
  | 'testPipelineFlyout.title'
  | 'documentationLink';
