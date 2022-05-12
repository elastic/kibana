/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';
import { createFormToggleAction } from './form_toggle_action';
import { createFormToggleAndSetValueAction } from './form_toggle_and_set_value_action';

export const createIndexPriorityActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  const toggleSelector = `${phase}-indexPrioritySwitch`;
  return {
    indexPriorityExists: () => exists(toggleSelector),
    toggleIndexPriority: createFormToggleAction(testBed, toggleSelector),
    setIndexPriority: createFormToggleAndSetValueAction(
      testBed,
      toggleSelector,
      `${phase}-indexPriority`
    ),
  };
};
