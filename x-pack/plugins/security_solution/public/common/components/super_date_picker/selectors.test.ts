/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  policySelector,
  durationSelector,
  kindSelector,
  startSelector,
  endSelector,
  fromStrSelector,
  toStrSelector,
  isLoadingSelector,
  queriesSelector,
} from './selectors';
import { InputsRange, AbsoluteTimeRange, RelativeTimeRange } from '../../store/inputs/model';
import { cloneDeep } from 'lodash/fp';

describe('selectors', () => {
  let absoluteTime: AbsoluteTimeRange = {
    kind: 'absolute',
    fromStr: undefined,
    toStr: undefined,
    from: 0,
    to: 0,
  };

  let inputState: InputsRange = {
    timerange: absoluteTime,
    policy: {
      kind: 'manual',
      duration: 0,
    },
    queries: [],
    linkTo: [],
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  };

  const getPolicySelector = policySelector();
  const getDurationSelector = durationSelector();
  const getKindSelector = kindSelector();
  const getStartSelector = startSelector();
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getToStrSelector = toStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getQueriesSelector = queriesSelector();

  beforeEach(() => {
    absoluteTime = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from: 0,
      to: 0,
    };

    inputState = {
      timerange: absoluteTime,
      policy: {
        kind: 'manual',
        duration: 0,
      },
      queries: [],
      linkTo: [],
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
    };
  });

  describe('#policySelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getPolicySelector(inputState);
      const result2 = getPolicySelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getPolicySelector(inputState);
      const result2 = getPolicySelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different policy kind', () => {
      const result1 = getPolicySelector(inputState);
      const change: InputsRange = {
        ...inputState,
        policy: { ...inputState.policy, kind: 'interval' },
      };
      const result2 = getPolicySelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#durationSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getDurationSelector(inputState);
      const result2 = getDurationSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getDurationSelector(inputState);
      const result2 = getDurationSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different duration', () => {
      const result1 = getDurationSelector(inputState);
      const change: InputsRange = {
        ...inputState,
        policy: { ...inputState.policy, duration: 1 },
      };
      const result2 = getDurationSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#kindSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getKindSelector(inputState);
      const result2 = getKindSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getKindSelector(inputState);
      const result2 = getKindSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different time range', () => {
      const result1 = getKindSelector(inputState);
      const relativeTime: RelativeTimeRange = {
        kind: 'relative',
        fromStr: '',
        toStr: '',
        from: 1,
        to: 0,
      };
      const change: InputsRange = {
        ...inputState,
        timerange: { ...relativeTime },
      };
      const result2 = getKindSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#startSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getStartSelector(inputState);
      const result2 = getStartSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getStartSelector(inputState);
      const result2 = getStartSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different time range', () => {
      const result1 = getStartSelector(inputState);
      const relativeTime: RelativeTimeRange = {
        kind: 'relative',
        fromStr: '',
        toStr: '',
        from: 1,
        to: 0,
      };
      const change: InputsRange = {
        ...inputState,
        timerange: { ...relativeTime },
      };
      const result2 = getStartSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#endSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getEndSelector(inputState);
      const result2 = getEndSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getEndSelector(inputState);
      const result2 = getEndSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different time range', () => {
      const result1 = getEndSelector(inputState);
      const relativeTime: RelativeTimeRange = {
        kind: 'relative',
        fromStr: '',
        toStr: '',
        from: 0,
        to: 1,
      };
      const change: InputsRange = {
        ...inputState,
        timerange: { ...relativeTime },
      };
      const result2 = getEndSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#fromStrSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getFromStrSelector(inputState);
      const result2 = getFromStrSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getFromStrSelector(inputState);
      const result2 = getFromStrSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different time range', () => {
      const result1 = getFromStrSelector(inputState);
      const relativeTime: RelativeTimeRange = {
        kind: 'relative',
        fromStr: '',
        toStr: '',
        from: 0,
        to: 0,
      };
      const change: InputsRange = {
        ...inputState,
        timerange: { ...relativeTime },
      };
      const result2 = getFromStrSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#toStrSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getToStrSelector(inputState);
      const result2 = getToStrSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getToStrSelector(inputState);
      const result2 = getToStrSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different time range', () => {
      const result1 = getToStrSelector(inputState);
      const relativeTime: RelativeTimeRange = {
        kind: 'relative',
        fromStr: '',
        toStr: '',
        from: 0,
        to: 0,
      };
      const change: InputsRange = {
        ...inputState,
        timerange: { ...relativeTime },
      };
      const result2 = getToStrSelector(change);
      expect(result1).not.toBe(result2);
    });
  });

  describe('#isLoadingSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getIsLoadingSelector(inputState);
      const result2 = getIsLoadingSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('returns the same reference given different input twice but with different deep copies', () => {
      const clone = cloneDeep(inputState);
      const result1 = getIsLoadingSelector(inputState);
      const result2 = getIsLoadingSelector(clone);
      expect(result1).toBe(result2);
    });

    test('returns a different reference given different loading', () => {
      const result1 = getIsLoadingSelector(inputState);
      const change: InputsRange = {
        ...inputState,
        queries: [
          {
            loading: true,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ],
      };
      const result2 = getIsLoadingSelector(change);
      expect(result1).not.toBe(result2);
    });

    test('returns false if there are no queries loading', () => {
      const inputsRange: InputsRange = {
        ...inputState,
        queries: [
          {
            loading: false,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
          {
            loading: false,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ],
      };
      const result = getIsLoadingSelector(inputsRange);
      expect(result).toBe(false);
    });

    test('returns true if at least one query is loading', () => {
      const inputsRange: InputsRange = {
        ...inputState,
        queries: [
          {
            loading: false,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
          {
            loading: true,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ],
      };
      const result = getIsLoadingSelector(inputsRange);
      expect(result).toBe(true);
    });
  });

  describe('#queriesSelector', () => {
    test('returns the same reference given the same identical input twice', () => {
      const result1 = getQueriesSelector(inputState);
      const result2 = getQueriesSelector(inputState);
      expect(result1).toBe(result2);
    });

    test('DOES NOT return the same reference given different input twice but with different deep copies since the query is not a primitive', () => {
      const clone = cloneDeep(inputState);
      const result1 = getQueriesSelector(inputState);
      const result2 = getQueriesSelector(clone);
      expect(result1).not.toBe(result2);
    });

    test('returns a different reference even if the contents are the same since query is an array and not a primitive', () => {
      const result1 = getQueriesSelector(inputState);
      const change: InputsRange = {
        ...inputState,
        queries: [
          {
            loading: false,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ],
      };
      const result2 = getQueriesSelector(change);
      expect(result1).not.toBe(result2);
    });
  });
});
