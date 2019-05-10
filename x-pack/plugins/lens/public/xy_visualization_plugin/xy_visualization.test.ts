/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization, XyVisualizationPersistedState } from './xy_visualization';

describe('IndexPattern Data Source', () => {
  let persistedState: XyVisualizationPersistedState;

  beforeEach(() => {
    persistedState = {
      roles: [],
    };
  });

  describe('#initialize', () => {
    it('loads default state', () => {
      expect(xyVisualization.initialize()).toEqual({
        roles: [],
      });
    });

    it('loads from persisted state', () => {
      expect(xyVisualization.initialize(persistedState)).toEqual({
        roles: [],
      });
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(
        xyVisualization.getPersistableState({
          roles: [],
        })
      ).toEqual({
        roles: [],
      });
    });
  });
});
