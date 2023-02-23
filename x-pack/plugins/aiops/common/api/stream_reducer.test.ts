/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addChangePointsAction,
  resetAllAction,
  updateLoadingStateAction,
} from './explain_log_rate_spikes';
import { initialState, streamReducer } from './stream_reducer';

describe('streamReducer', () => {
  it('updates loading state', () => {
    const state = streamReducer(
      initialState,
      updateLoadingStateAction({ ccsWarning: true, loaded: 50, loadingState: 'Loaded 50%' })
    );

    expect(state).toEqual({
      ccsWarning: true,
      loaded: 50,
      loadingState: 'Loaded 50%',
      changePoints: [],
      changePointsGroups: [],
      errors: [],
    });
  });

  it('adds change point, then resets state again', () => {
    const state1 = streamReducer(
      initialState,
      addChangePointsAction([
        {
          fieldName: 'the-field-name',
          fieldValue: 'the-field-value',
          doc_count: 10,
          bg_count: 100,
          total_doc_count: 1000,
          total_bg_count: 10000,
          score: 0.1,
          pValue: 0.01,
          normalizedScore: 0.123,
        },
      ])
    );

    expect(state1.changePoints).toHaveLength(1);

    const state2 = streamReducer(state1, resetAllAction());

    expect(state2.changePoints).toHaveLength(0);
  });
});
