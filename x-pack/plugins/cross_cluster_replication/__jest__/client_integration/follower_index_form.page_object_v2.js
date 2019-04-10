/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../test_utils';
import { ccrStore } from '../../public/app/store';

export const setup = (component, props = {}, options) => {
  const getTestBed = registerTestBed(component, {}, ccrStore);
  const testBed = getTestBed(props, options);

  // Page Objects
  const objectsToDataTestSubject = {
    loadingRemoteClusters: 'remoteClustersLoading',
    docsButton: 'followerIndexDocsButton',
    saveFormButton: 'ccrFollowerIndexFormSubmitButton',
    form: 'ccrFollowerIndexForm',
    formError: 'followerIndexFormError',
    saveFormButton: 'ccrFollowerIndexFormSubmitButton',
  };

  // Actions
  const clickSaveForm = () => {
    testBed.find('ccrFollowerIndexFormSubmitButton').simulate('click');
  };

  const toggleAdvancedSettings = () => {
    testBed.form.selectCheckBox('ccrFollowerIndexFormCustomAdvancedSettingsToggle');
  };

  return {
    ...testBed,
    // Custom API for the current test file
    find: (object) => testBed.find(objectsToDataTestSubject[object] || object),
    exists: (object) => testBed.exists(objectsToDataTestSubject[object] || object),
    actions: {
      clickSaveForm,
      toggleAdvancedSettings,
    },
  };
};
