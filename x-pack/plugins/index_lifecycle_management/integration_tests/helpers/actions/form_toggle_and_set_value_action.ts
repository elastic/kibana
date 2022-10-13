/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { createFormToggleAction } from './form_toggle_action';
import { createFormSetValueAction } from './form_set_value_action';

export const createFormToggleAndSetValueAction =
  (testBed: TestBed, toggleSelector: string, inputSelector: string) => async (value: string) => {
    const { exists } = testBed;
    if (!exists(inputSelector)) {
      await createFormToggleAction(testBed, toggleSelector)();
    }
    await createFormSetValueAction(testBed, inputSelector)(value);
  };
