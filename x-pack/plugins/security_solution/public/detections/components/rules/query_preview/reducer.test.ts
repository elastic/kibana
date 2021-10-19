/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import * as i18n from './translations';
import { Action, State, queryPreviewReducer } from './reducer';
import { initialState } from './';

describe('queryPreviewReducer', () => {
  let reducer: (state: State, action: Action) => State;

  beforeEach(() => {
    moment.tz.setDefault('UTC');
    reducer = queryPreviewReducer();
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#setQueryInfo', () => {
    test('should not update state if queryBar undefined', () => {
      const update = reducer(initialState, {
        type: 'setQueryInfo',
        queryBar: undefined,
        index: ['foo-*'],
        ruleType: 'query',
      });

      expect(update).toEqual(initialState);
    });

    test('should reset showHistogram if queryBar undefined', () => {
      const update = reducer(
        { ...initialState, showHistogram: true },
        {
          type: 'setQueryInfo',
          queryBar: undefined,
          index: ['foo-*'],
          ruleType: 'query',
        }
      );

      expect(update.showHistogram).toBeFalsy();
    });

    test('should reset showHistogram if queryBar defined', () => {
      const update = reducer(
        { ...initialState, showHistogram: true, warnings: ['uh oh'] },
        {
          type: 'setQueryInfo',
          queryBar: {
            query: { query: 'host.name:*', language: 'kuery' },
            filters: [{ meta: { alias: '', disabled: false, negate: false } }],
          },
          index: ['foo-*'],
          ruleType: 'query',
        }
      );

      expect(update.showHistogram).toBeFalsy();
    });

    test('should pull the query, language, and filters from the action', () => {
      const update = reducer(initialState, {
        type: 'setQueryInfo',
        queryBar: {
          query: { query: 'host.name:*', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        index: ['foo-*'],
        ruleType: 'query',
      });

      expect(update.language).toEqual('kuery');
      expect(update.queryString).toEqual('host.name:*');
      expect(update.filters).toEqual([
        { meta: { alias: '', disabled: false, negate: false }, query: {} },
      ]);
    });

    test('should create the queryFilter if query type is not eql', () => {
      const update = reducer(initialState, {
        type: 'setQueryInfo',
        queryBar: {
          query: { query: 'host.name:*', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        index: ['foo-*'],
        ruleType: 'query',
      });

      expect(update.queryFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] } },
            {},
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('should set query to empty string if it is not of type string', () => {
      const update = reducer(initialState, {
        type: 'setQueryInfo',
        queryBar: {
          query: { query: { not: 'a string' }, language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        index: ['foo-*'],
        ruleType: 'query',
      });

      expect(update.queryString).toEqual('');
    });
  });

  describe('#setTimeframeSelect', () => {
    test('should update timeframe with that specified in action" ', () => {
      const update = reducer(initialState, {
        type: 'setTimeframeSelect',
        timeframe: 'd',
      });

      expect(update.timeframe).toEqual('d');
    });

    test('should reset warnings and showHistogram to false" ', () => {
      const update = reducer(
        { ...initialState, showHistogram: true, warnings: ['blah'] },
        {
          type: 'setTimeframeSelect',
          timeframe: 'd',
        }
      );

      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });
  });

  describe('#setResetRuleTypeChange', () => {
    test('should reset timeframe, warnings, and hide histogram on rule type change" ', () => {
      const update = reducer(
        { ...initialState, timeframe: 'd', showHistogram: true, warnings: ['blah'] },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'eql',
        }
      );

      expect(update.showHistogram).toBeFalsy();
      expect(update.timeframe).toEqual('h');
      expect(update.warnings).toEqual([]);
      expect(update.showNonEqlHistogram).toBeFalsy();
    });

    test('should set timeframe options to hour and day if rule type is eql" ', () => {
      const update = reducer(
        { ...initialState, timeframe: 'd', showHistogram: true, warnings: ['blah'] },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'eql',
        }
      );

      expect(update.timeframeOptions).toEqual([
        {
          text: 'Last hour',
          value: 'h',
        },
        {
          text: 'Last day',
          value: 'd',
        },
      ]);
    });

    test('should set "showNonEqlHist" to true and timeframe options to hour, day, and month if rule type is query" ', () => {
      const update = reducer(
        { ...initialState, timeframe: 'd', showHistogram: true, warnings: ['blah'] },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'query',
        }
      );

      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.timeframeOptions).toEqual([
        {
          text: 'Last hour',
          value: 'h',
        },
        {
          text: 'Last day',
          value: 'd',
        },
        {
          text: 'Last month',
          value: 'M',
        },
      ]);
    });

    test('should set "showNonEqlHist" to true and timeframe options to hour, day, and month if rule type is saved_query" ', () => {
      const update = reducer(
        { ...initialState, timeframe: 'd', showHistogram: true, warnings: ['blah'] },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'saved_query',
        }
      );

      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.timeframeOptions).toEqual([
        {
          text: 'Last hour',
          value: 'h',
        },
        {
          text: 'Last day',
          value: 'd',
        },
        {
          text: 'Last month',
          value: 'M',
        },
      ]);
    });

    test('should set "showNonEqlHist" to true and timeframe options to hour, day, and month if rule type is threshold and no threshold field is specified" ', () => {
      const update = reducer(
        {
          ...initialState,
          timeframe: 'd',
          showHistogram: true,
          warnings: ['blah'],
          thresholdFieldExists: false,
        },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'threshold',
        }
      );

      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.timeframeOptions).toEqual([
        {
          text: 'Last hour',
          value: 'h',
        },
        {
          text: 'Last day',
          value: 'd',
        },
        {
          text: 'Last month',
          value: 'M',
        },
      ]);
    });

    test('should set "showNonEqlHist" to false and timeframe options to hour, day, and month if rule type is threshold and threshold field is specified" ', () => {
      const update = reducer(
        {
          ...initialState,
          timeframe: 'd',
          showHistogram: true,
          warnings: ['blah'],
          thresholdFieldExists: true,
        },
        {
          type: 'setResetRuleTypeChange',
          ruleType: 'threshold',
        }
      );

      expect(update.showNonEqlHistogram).toBeFalsy();
      expect(update.timeframeOptions).toEqual([
        {
          text: 'Last hour',
          value: 'h',
        },
        {
          text: 'Last day',
          value: 'd',
        },
        {
          text: 'Last month',
          value: 'M',
        },
      ]);
    });
  });

  describe('#setWarnings', () => {
    test('should set warnings to that passed in action" ', () => {
      const update = reducer(initialState, {
        type: 'setWarnings',
        warnings: ['bad'],
      });

      expect(update.warnings).toEqual(['bad']);
    });
  });

  describe('#setShowHistogram', () => {
    test('should set "setShowHistogram" to false if "action.show" is false', () => {
      const update = reducer(initialState, {
        type: 'setShowHistogram',
        show: false,
      });

      expect(update.showHistogram).toBeFalsy();
    });

    test('should set "disableOr" to true if "action.show" is true', () => {
      const update = reducer(initialState, {
        type: 'setShowHistogram',
        show: true,
      });

      expect(update.showHistogram).toBeTruthy();
    });
  });

  describe('#setThresholdQueryVals', () => {
    test('should set thresholdFieldExists to true if threshold field is defined and not empty string', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: ['agent.hostname'],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'threshold',
      });

      expect(update.thresholdFieldExists).toBeTruthy();
      expect(update.showNonEqlHistogram).toBeFalsy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });

    test('should set thresholdFieldExists to false if threshold field is empty array', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: [],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'threshold',
      });

      expect(update.thresholdFieldExists).toBeFalsy();
      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });

    test('should set thresholdFieldExists to false if threshold field is empty string', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: ['    '],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'threshold',
      });

      expect(update.thresholdFieldExists).toBeFalsy();
      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });

    test('should set showNonEqlHistogram to false if ruleType is eql', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: ['agent.hostname'],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'eql',
      });

      expect(update.showNonEqlHistogram).toBeFalsy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });

    test('should set showNonEqlHistogram to true if ruleType is query', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: ['agent.hostname'],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'query',
      });

      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });

    test('should set showNonEqlHistogram to true if ruleType is saved_query', () => {
      const update = reducer(initialState, {
        type: 'setThresholdQueryVals',
        threshold: {
          field: ['agent.hostname'],
          value: '200',
          cardinality: {
            field: ['user.name'],
            value: '2',
          },
        },
        ruleType: 'saved_query',
      });

      expect(update.showNonEqlHistogram).toBeTruthy();
      expect(update.showHistogram).toBeFalsy();
      expect(update.warnings).toEqual([]);
    });
  });

  describe('#setToFrom', () => {
    test('should update to and from times to be an hour apart if timeframe is "h"', () => {
      const update = reducer(
        { ...initialState, timeframe: 'h' },
        {
          type: 'setToFrom',
        }
      );

      const dateFrom = moment(update.fromTime);
      const dateTo = moment(update.toTime);
      const diff = dateFrom.diff(dateTo);

      // 3600000ms = 60 minutes
      // Sometimes test returns 3599999
      expect(Math.ceil(diff / 100000) * 100000).toEqual(3600000);
    });

    test('should update to and from times to be a day apart if timeframe is "d"', () => {
      const update = reducer(
        { ...initialState, timeframe: 'd' },
        {
          type: 'setToFrom',
        }
      );

      const dateFrom = moment(update.fromTime);
      const dateTo = moment(update.toTime);
      const diff = dateFrom.diff(dateTo);

      // 86400000 = 24 hours
      // Sometimes test returns 86399999
      expect(Math.ceil(diff / 100000) * 100000).toEqual(86400000);
    });
  });

  describe('#setNoiseWarning', () => {
    test('should add noise warning', () => {
      const update = reducer(
        { ...initialState, warnings: ['uh oh'] },
        {
          type: 'setNoiseWarning',
        }
      );

      expect(update.warnings).toEqual(['uh oh', i18n.QUERY_PREVIEW_NOISE_WARNING]);
    });
  });
});
