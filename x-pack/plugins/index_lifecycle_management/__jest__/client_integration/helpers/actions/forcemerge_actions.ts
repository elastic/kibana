/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';
import { createFormToggleAction } from './form_toggle_action';
import { createFormSetValueAction } from './form_set_value_action';

const createFormCheckboxAction =
  (testBed: TestBed, dataTestSubject: string) => async (checked: boolean) => {
    const { form, component } = testBed;
    await act(async () => {
      form.selectCheckBox(dataTestSubject, checked);
    });
    component.update();
  };

export const createForceMergeActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  const toggleSelector = `${phase}-forceMergeSwitch`;
  return {
    forceMergeExists: () => exists(toggleSelector),
    toggleForceMerge: createFormToggleAction(testBed, toggleSelector),
    setForcemergeSegmentsCount: createFormSetValueAction(
      testBed,
      `${phase}-selectedForceMergeSegments`
    ),
    setBestCompression: createFormCheckboxAction(testBed, `${phase}-bestCompression`),
  };
};
