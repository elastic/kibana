/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAggNameConflictToastMessages,
  getRenamedAggNameAndMsgDueToConflict,
} from './get_agg_name_conflict_toast_messages';
import {
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
} from '../../../../../common';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../common/types/pivot_aggs';

describe('agg name conflict', () => {
  const aggList: PivotAggsConfigDict = {
    'the-agg-name': {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field-name',
      aggName: 'the-agg-name',
      dropDownName: 'the-dropdown-name',
    },
    'the-namespaced-agg-name.namespace': {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field-name',
      aggName: 'the-namespaced-agg-name.namespace',
      dropDownName: 'the-dropdown-name',
    },
  };

  const groupByList: PivotGroupByConfigDict = {
    'the-group-by-agg-name': {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-field-name',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-dropdown-name',
    },
    'the-namespaced-group-by-agg-name.namespace': {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-field-name',
      aggName: 'the-namespaced-group-by-agg-name.namespace',
      dropDownName: 'the-dropdown-name',
    },
  };

  describe('getAggNameConflictToastMessages', () => {
    test('detect aggregation name conflicts', () => {
      // no conflict, completely different name, no namespacing involved
      expect(
        getAggNameConflictToastMessages('the-other-agg-name', aggList, groupByList)
      ).toHaveLength(0);
      // no conflict, completely different name and no conflicting namespace
      expect(
        getAggNameConflictToastMessages('the-other-agg-name.namespace', aggList, groupByList)
      ).toHaveLength(0);

      // exact match conflict on aggregation name
      expect(getAggNameConflictToastMessages('the-agg-name', aggList, groupByList)).toStrictEqual([
        `An aggregation configuration with the name 'the-agg-name' already exists.`,
      ]);
      // namespace conflict with `the-agg-name` aggregation
      expect(
        getAggNameConflictToastMessages('the-agg-name.namespace', aggList, groupByList)
      ).toStrictEqual([
        `Couldn't add configuration 'the-agg-name.namespace' because of a nesting conflict with 'the-agg-name'.`,
      ]);

      // exact match conflict on group-by name
      expect(
        getAggNameConflictToastMessages('the-group-by-agg-name', aggList, groupByList)
      ).toStrictEqual([
        `A group by configuration with the name 'the-group-by-agg-name' already exists.`,
      ]);
      // namespace conflict with `the-group-by-agg-name` group-by
      expect(
        getAggNameConflictToastMessages('the-group-by-agg-name.namespace', aggList, groupByList)
      ).toStrictEqual([
        `Couldn't add configuration 'the-group-by-agg-name.namespace' because of a nesting conflict with 'the-group-by-agg-name'.`,
      ]);

      // exact match conflict on namespaced agg name
      expect(
        getAggNameConflictToastMessages('the-namespaced-agg-name.namespace', aggList, groupByList)
      ).toStrictEqual([
        `An aggregation configuration with the name 'the-namespaced-agg-name.namespace' already exists.`,
      ]);
      // no conflict, same base agg name but different namespace
      expect(
        getAggNameConflictToastMessages('the-namespaced-agg-name.namespace2', aggList, groupByList)
      ).toHaveLength(0);
      // namespace conflict because the new agg name is base name of existing nested field
      expect(
        getAggNameConflictToastMessages('the-namespaced-agg-name', aggList, groupByList)
      ).toStrictEqual([
        `Couldn't add configuration 'the-namespaced-agg-name' because of a nesting conflict with 'the-namespaced-agg-name.namespace'.`,
      ]);

      // exact match conflict on namespaced group-by name
      expect(
        getAggNameConflictToastMessages(
          'the-namespaced-group-by-agg-name.namespace',
          aggList,
          groupByList
        )
      ).toStrictEqual([
        `A group by configuration with the name 'the-namespaced-group-by-agg-name.namespace' already exists.`,
      ]);
      // no conflict, same base group-by name but different namespace
      expect(
        getAggNameConflictToastMessages(
          'the-namespaced-group-by-agg-name.namespace2',
          aggList,
          groupByList
        )
      ).toHaveLength(0);
      // namespace conflict because the new group-by name is base name of existing nested field
      expect(
        getAggNameConflictToastMessages('the-namespaced-group-by-agg-name', aggList, groupByList)
      ).toStrictEqual([
        `Couldn't add configuration 'the-namespaced-group-by-agg-name' because of a nesting conflict with 'the-namespaced-group-by-agg-name.namespace'.`,
      ]);
    });
  });

  describe('getRenamedAggNameAndMsgDueToConflict', () => {
    it('returns new agg name and explains conflict', () => {
      // conflict: adding new aggBy with name matching group by
      expect(
        getRenamedAggNameAndMsgDueToConflict('timestamp.value_count', aggList, {
          ...groupByList,
          timestamp: {
            agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
            field: 'timestamp',
            aggName: 'timestamp.namespace',
            dropDownName: 'the-dropdown-name',
          },
        })
      ).toEqual({
        newAggName: 'timestamp1.value_count',
        toastMsg:
          "Renamed 'timestamp.value_count' to 'timestamp1.value_count' because of a nesting conflict.",
      });
    });
    it('checks for pivot group by config if supplied', () => {
      // adding new group by has conflict with previous agg
      expect(
        getRenamedAggNameAndMsgDueToConflict(
          'customer_birth_date',
          {
            ...aggList,
            'customer_birth_date.value_count': {
              agg: 'value_count',
              aggName: 'customer_birth_date.value_count',
              dropDownName: 'value_count(customer_birth_date)',
              field: 'customer_birth_date',
            },
          },
          {},
          {
            agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
            aggName: 'customer_birth_date',
            dropDownName: 'date_histogram(customer_birth_date)',
            field: 'customer_birth_date',
            calendar_interval: '1m',
          }
        )
      ).toEqual({
        newAggName: 'customer_birth_date1',
        toastMsg:
          "Renamed 'customer_birth_date' to 'customer_birth_date1' because of a nesting conflict.",
      });
    });
    it('always return undefined if agg is not date_histogram type', () => {
      expect(
        getRenamedAggNameAndMsgDueToConflict(
          'the-namespaced-group-by-agg-name.namespace2',
          aggList,
          groupByList
        )
      ).toEqual({
        newAggName: undefined,
        toastMsg: undefined,
      });
      expect(getRenamedAggNameAndMsgDueToConflict('the-agg-name', aggList, groupByList)).toEqual({
        newAggName: undefined,
        toastMsg: undefined,
      });
    });
  });
});
