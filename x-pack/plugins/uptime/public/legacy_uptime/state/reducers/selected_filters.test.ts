/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectedFiltersReducer } from './selected_filters';
import {
  getSelectedFilters,
  setSelectedFilters,
  SelectedFilters,
} from '../actions/selected_filters';
import { createAction } from 'redux-actions';

describe('selectedFiltersReducer', () => {
  let state: SelectedFilters;

  beforeEach(() => {
    state = {
      locations: [],
      ports: [],
      schemes: ['http'],
      tags: [],
    };
  });

  it('returns state by default', () => {
    expect(selectedFiltersReducer(state, createAction<void>('fake action')())).toEqual(state);
  });

  describe('setSelectedFilters', () => {
    it('returns null for null payload', () => {
      expect(selectedFiltersReducer(state, setSelectedFilters(null))).toBeNull();
    });

    it('sets state to the action payload if state is null', () => {
      expect(
        selectedFiltersReducer(
          null,
          setSelectedFilters({
            locations: [],
            ports: ['5601'],
            schemes: [],
            tags: [],
          })
        )
      ).toEqual({ locations: [], ports: ['5601'], schemes: [], tags: [] });
    });

    it('merges state and action payload', () => {
      expect(
        selectedFiltersReducer(
          {
            locations: [],
            ports: [],
            schemes: [],
            tags: [],
          },
          setSelectedFilters({
            locations: [],
            ports: ['5601'],
            schemes: [],
            tags: ['prod'],
          })
        )
      ).toEqual({ locations: [], ports: ['5601'], schemes: [], tags: ['prod'] });
    });
  });

  describe('getSelectedFilters', () => {
    it('returns the state', () => {
      expect(selectedFiltersReducer(state, getSelectedFilters())).toEqual(state);
    });
  });
});
