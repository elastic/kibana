/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__';

import { ResultSettingsLogic } from './';

describe('ResultSettingsLogic', () => {
  const { mount } = new LogicMounter(ResultSettingsLogic);

  const DEFAULT_VALUES = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ResultSettingsLogic.values).toEqual(DEFAULT_VALUES);
  });
});
