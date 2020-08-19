/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  beforeEach(() => {
    resetContext({});
    AppLogic.mount();
  });

  const DEFAULT_VALUES = {
    hasInitialized: false,
  };

  it('has expected default values', () => {
    expect(AppLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('initializeAppData()', () => {
    it('sets values based on passed props', () => {
      AppLogic.actions.initializeAppData({}); // TODO: args

      expect(AppLogic.values).toEqual({
        hasInitialized: true,
      });
    });
  });
});
