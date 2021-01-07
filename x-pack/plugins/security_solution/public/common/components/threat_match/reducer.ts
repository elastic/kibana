/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ThreatMapEntries } from './types';
import { getDefaultEmptyEntry } from './helpers';

export type ViewerModalName = 'addModal' | 'editModal' | null;

export interface State {
  andLogicIncluded: boolean;
  entries: ThreatMapEntries[];
  entriesToDelete: ThreatMapEntries[];
}

export type Action =
  | {
      type: 'setEntries';
      entries: ThreatMapEntries[];
    }
  | {
      type: 'setDefault';
      initialState: State;
      lastEntry: ThreatMapEntries;
    };

export const reducer = () => (state: State, action: Action): State => {
  switch (action.type) {
    case 'setEntries': {
      const isAndLogicIncluded =
        action.entries.filter(({ entries }) => entries.length > 1).length > 0;

      const returnState = {
        ...state,
        andLogicIncluded: isAndLogicIncluded,
        entries: action.entries,
      };
      return returnState;
    }
    case 'setDefault': {
      return {
        ...state,
        ...action.initialState,
        entries: [{ ...action.lastEntry, entries: [getDefaultEmptyEntry()] }],
      };
    }
    default:
      return state;
  }
};
