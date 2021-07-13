/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test/jest';
import { Phase } from '../../../../common/types';
import { createFormToggleAction } from './form_toggle_action';

export const createFreezeActions = (testBed: TestBed, phase: Phase) => {
  const { exists } = testBed;
  return {
    setFreeze: createFormToggleAction(testBed, `${phase}-freezeSwitch`),
    freezeExists: (): boolean => exists(`${phase}-freezeSwitch`),
  };
};
