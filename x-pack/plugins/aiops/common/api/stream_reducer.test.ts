/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTerms } from '../__mocks__/artificial_logs/significant_terms';
import { finalSignificantTermGroups } from '../__mocks__/artificial_logs/final_significant_term_groups';

import {
  addSignificantTermsAction,
  addSignificantTermsGroupAction,
  resetAllAction,
  resetGroupsAction,
  updateLoadingStateAction,
} from './log_rate_analysis';
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
      significantTerms: [],
      significantTermsGroups: [],
      errors: [],
    });
  });

  it('adds significant term, then resets all state again', () => {
    const state1 = streamReducer(
      initialState,
      addSignificantTermsAction([
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

    expect(state1.significantTerms).toHaveLength(1);

    const state2 = streamReducer(state1, resetAllAction());

    expect(state2.significantTerms).toHaveLength(0);
  });

  it('adds significant terms and groups, then resets groups only', () => {
    const state1 = streamReducer(initialState, addSignificantTermsAction(significantTerms));

    expect(state1.significantTerms).toHaveLength(4);
    expect(state1.significantTermsGroups).toHaveLength(0);

    const state2 = streamReducer(
      state1,
      addSignificantTermsGroupAction(finalSignificantTermGroups)
    );

    expect(state2.significantTerms).toHaveLength(4);
    expect(state2.significantTermsGroups).toHaveLength(4);

    const state3 = streamReducer(state2, resetGroupsAction());

    expect(state3.significantTerms).toHaveLength(4);
    expect(state3.significantTermsGroups).toHaveLength(0);
  });
});
