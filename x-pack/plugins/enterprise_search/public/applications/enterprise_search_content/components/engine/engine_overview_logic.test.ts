/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { EngineOverviewLogic, EngineOverviewValues } from './engine_overview_logic';

const DEFAULT_VALUES: EngineOverviewValues = {
  documentsCount: 0,
  engineData: undefined,
  engineFieldCapabilitiesApiStatus: Status.IDLE,
  engineFieldCapabilitiesData: undefined,
  engineName: '',
  fieldsCount: 0,
  indices: [],
  indicesCount: 0,
  isLoadingEngine: true,
};

describe('EngineOverviewLogic', () => {
  const { mount } = new LogicMounter(EngineOverviewLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mount();
  });

  it('has expected default values', () => {
    expect(EngineOverviewLogic.values).toEqual(DEFAULT_VALUES);
  });
});
