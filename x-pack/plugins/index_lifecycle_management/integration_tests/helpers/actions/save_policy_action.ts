/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

export const createSavePolicyAction = (testBed: TestBed) => async () => {
  const { find, component } = testBed;

  await act(async () => {
    find('savePolicyButton').simulate('click');
  });

  component.update();
};
