/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { EngineViewLogic, EngineViewValues } from './engine_view_logic';

const DEFAULT_VALUES: EngineViewValues = {
  engineData: undefined,
  engineName: 'my-test-engine',
  fetchEngineApiError: undefined,
  fetchEngineApiStatus: Status.IDLE,
  isLoadingEngine: true,
};

describe('EngineViewLogic', () => {
  const { mount } = new LogicMounter(EngineViewLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mount({ engineName: DEFAULT_VALUES.engineName }, { engineName: DEFAULT_VALUES.engineName });
  });

  it('has expected default values', () => {
    expect(EngineViewLogic.values).toEqual(DEFAULT_VALUES);
  });
});
