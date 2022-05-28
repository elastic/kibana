/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__/kea_logic';
import { mockApiLog } from '../__mocks__/api_log.mock';

import { ApiLogLogic } from '.';

describe('ApiLogLogic', () => {
  const { mount } = new LogicMounter(ApiLogLogic);

  const DEFAULT_VALUES = {
    isFlyoutOpen: false,
    apiLog: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ApiLogLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('openFlyout', () => {
      it('sets isFlyoutOpen to true & sets the current apiLog', () => {
        mount({ isFlyoutOpen: false, apiLog: null });
        ApiLogLogic.actions.openFlyout(mockApiLog);

        expect(ApiLogLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: true,
          apiLog: mockApiLog,
        });
      });
    });

    describe('closeFlyout', () => {
      it('sets isFlyoutOpen to false & resets the current apiLog', () => {
        mount({ isFlyoutOpen: true, apiLog: mockApiLog });
        ApiLogLogic.actions.closeFlyout();

        expect(ApiLogLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isFlyoutOpen: false,
          apiLog: null,
        });
      });
    });
  });
});
