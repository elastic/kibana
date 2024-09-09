/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupByCardinalityFilters } from './get_group_by_cardinality_filters';
import { ALL_VALUE } from '@kbn/slo-schema';

describe('get group by cardinality filters', () => {
  it('formats filters correctly', () => {
    const serviceName = 'testService';
    const environment = 'testEnvironment';
    const transactionName = 'testTransactionName';
    const transactionType = 'testTransactionType';
    expect(
      getGroupByCardinalityFilters({ serviceName, environment, transactionName, transactionType })
    ).toEqual([
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'service.name',
          negate: false,
          params: serviceName,
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: { match_phrase: { 'service.name': serviceName } },
          },
        },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'service.environment',
          negate: false,
          params: environment,
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: { match_phrase: { 'service.environment': environment } },
          },
        },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'transaction.type',
          negate: false,
          params: transactionType,
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: { match_phrase: { 'transaction.type': transactionType } },
          },
        },
      },
      {
        $state: { store: 'appState' },
        meta: {
          alias: null,
          disabled: false,
          key: 'transaction.name',
          negate: false,
          params: transactionName,
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: { match_phrase: { 'transaction.name': transactionName } },
          },
        },
      },
    ]);
  });

  it('does not include filters when values are undefined', () => {
    expect(
      getGroupByCardinalityFilters({
        // @ts-ignore
        serviceName: undefined,
        environment: undefined,
        transactionName: undefined,
        transactionType: undefined,
      })
    ).toEqual([]);
  });

  it('does not include filters when values are ALL_VALUE', () => {
    expect(
      getGroupByCardinalityFilters({
        serviceName: ALL_VALUE,
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
        transactionType: ALL_VALUE,
      })
    ).toEqual([]);
  });
});
