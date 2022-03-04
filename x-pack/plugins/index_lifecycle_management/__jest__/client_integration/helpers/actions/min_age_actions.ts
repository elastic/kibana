/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';
import { createFormSetValueAction } from './form_set_value_action';

export const createMinAgeActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  return {
    hasMinAgeInput: () => exists(`${phase}-selectedMinimumAge`),
    setMinAgeValue: createFormSetValueAction(testBed, `${phase}-selectedMinimumAge`),
    setMinAgeUnits: createFormSetValueAction(testBed, `${phase}-selectedMinimumAgeUnits`),
    hasRolloverTipOnMinAge: () => exists(`${phase}-rolloverMinAgeInputIconTip`),
  };
};
