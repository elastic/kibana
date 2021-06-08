/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test/jest';

import { act } from 'react-dom/test-utils';
import { Phase } from '../types';

const toggleDeletePhase = async (testBed: TestBed) => {
  const { find, component } = testBed;

  let button = find('disableDeletePhaseButton');
  if (!button.length) {
    button = find('enableDeletePhaseButton');
  }
  if (!button.length) {
    throw new Error(`Button to enable/disable delete phase was not found.`);
  }

  await act(async () => {
    button.simulate('click');
  });
  component.update();
};

const togglePhase = async (testBed: TestBed, phase: Phase) => {
  const { form, component } = testBed;
  await act(async () => {
    form.toggleEuiSwitch(`enablePhaseSwitch-${phase}`);
  });

  component.update();
};

export const createTogglePhaseAction = (testBed: TestBed) => async (phase: Phase) => {
  if (phase === 'delete') {
    await toggleDeletePhase(testBed);
  } else {
    await togglePhase(testBed, phase);
  }
};
