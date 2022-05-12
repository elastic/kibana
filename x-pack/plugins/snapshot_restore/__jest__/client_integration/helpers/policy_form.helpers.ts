/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed, SetupFunc } from '@kbn/test-jest-helpers';

export interface PolicyFormTestBed extends TestBed<PolicyFormTestSubjects> {
  actions: {
    clickNextButton: () => void;
    clickSubmitButton: () => void;
  };
}

export const formSetup = async (
  initTestBed: SetupFunc<PolicyFormTestSubjects>
): Promise<PolicyFormTestBed> => {
  const testBed = await initTestBed();

  // User actions
  const clickNextButton = () => {
    testBed.find('nextButton').simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('submitButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickSubmitButton,
    },
  };
};

export type PolicyFormTestSubjects =
  | 'advancedCronInput'
  | 'allIndicesToggle'
  | 'backButton'
  | 'deselectIndicesLink'
  | 'allDataStreamsToggle'
  | 'deselectDataStreamLink'
  | 'expireAfterValueInput'
  | 'expireAfterUnitSelect'
  | 'ignoreUnavailableIndicesToggle'
  | 'nameInput'
  | 'maxCountInput'
  | 'minCountInput'
  | 'nextButton'
  | 'pageTitle'
  | 'savePolicyApiError'
  | 'selectIndicesLink'
  | 'showAdvancedCronLink'
  | 'snapshotNameInput'
  | 'dataStreamBadge'
  | 'repositoryNotFoundWarning'
  | 'repositorySelect'
  | 'submitButton';
