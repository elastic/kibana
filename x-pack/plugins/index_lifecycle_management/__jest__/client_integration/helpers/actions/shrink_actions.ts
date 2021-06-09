/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test/jest';
import { Phase } from '../../../../common/types';
import { createFormToggleAction } from './form_toggle_action';
import { createFormSetValueAction } from './form_set_value_action';

export const createShrinkActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  const toggleSelector = `${phase}-shrinkSwitch`;
  return {
    shrinkExists: () => exists(toggleSelector),
    toggleShrink: createFormToggleAction(testBed, toggleSelector),
    setShrink: createFormSetValueAction(testBed, `${phase}-primaryShardCount`),
  };
};
