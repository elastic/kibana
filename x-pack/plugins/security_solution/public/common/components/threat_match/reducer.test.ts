/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThreatMapEntries } from './types';
import { State, reducer } from './reducer';
import { getDefaultEmptyEntry } from './helpers';
import { ThreatMapEntry } from '../../../../common/detection_engine/schemas/types';

const initialState: State = {
  andLogicIncluded: false,
  entries: [],
  entriesToDelete: [],
};

const getEntry = (): ThreatMapEntry => ({
  field: 'host.name',
  type: 'mapping',
  value: 'host.name',
});

describe('reducer', () => {
  describe('#setEntries', () => {
    test('should return "andLogicIncluded" ', () => {
      const update = reducer()(initialState, {
        type: 'setEntries',
        entries: [],
      });
      const expected: State = {
        andLogicIncluded: false,
        entries: [],
        entriesToDelete: [],
      };
      expect(update).toEqual(expected);
    });

    test('should set "andLogicIncluded" to true if any of the entries include entries with length greater than 1 ', () => {
      const entries: ThreatMapEntries[] = [
        {
          entries: [getEntry(), getEntry()],
        },
      ];
      const { andLogicIncluded } = reducer()(initialState, {
        type: 'setEntries',
        entries,
      });

      expect(andLogicIncluded).toBeTruthy();
    });

    test('should set "andLogicIncluded" to false if any of the entries include entries with length greater than 1 ', () => {
      const entries: ThreatMapEntries[] = [
        {
          entries: [getEntry()],
        },
      ];
      const { andLogicIncluded } = reducer()(initialState, {
        type: 'setEntries',
        entries,
      });

      expect(andLogicIncluded).toBeFalsy();
    });
  });

  describe('#setDefault', () => {
    test('should restore initial state and add default empty entry to item" ', () => {
      const entries: ThreatMapEntries[] = [
        {
          entries: [getEntry()],
        },
      ];

      const update = reducer()(
        {
          andLogicIncluded: true,
          entries,
          entriesToDelete: [],
        },
        {
          type: 'setDefault',
          initialState,
          lastEntry: {
            entries: [],
          },
        }
      );

      expect(update).toEqual({
        ...initialState,
        entries: [
          {
            entries: [getDefaultEmptyEntry()],
          },
        ],
      });
    });
  });
});
