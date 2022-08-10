/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addItemsToArray, deleteItemsFromArray, ruleParamsModifier } from './rule_params_modifier';
import { BulkActionEditType } from '../../../../../common/detection_engine/schemas/common/schemas';
import type { RuleAlertType } from '../types';

describe('addItemsToArray', () => {
  test('should add single item to array', () => {
    expect(addItemsToArray(['a', 'b', 'c'], ['d'])).toEqual(['a', 'b', 'c', 'd']);
  });

  test('should add multiple items to array', () => {
    expect(addItemsToArray(['a', 'b', 'c'], ['d', 'e'])).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('should not allow to add duplicated items', () => {
    expect(addItemsToArray(['a', 'c'], ['b', 'c'])).toEqual(['a', 'c', 'b']);
  });
});

describe('deleteItemsFromArray', () => {
  test('should remove single item from array', () => {
    expect(deleteItemsFromArray(['a', 'b', 'c'], ['c'])).toEqual(['a', 'b']);
  });

  test('should remove multiple items from array', () => {
    expect(deleteItemsFromArray(['a', 'b', 'c'], ['b', 'c'])).toEqual(['a']);
  });

  test('should return array unchanged if items to remove absent in array', () => {
    expect(deleteItemsFromArray(['a', 'c'], ['x', 'z'])).toEqual(['a', 'c']);
  });
});

describe('ruleParamsModifier', () => {
  const ruleParamsMock = { index: ['initial-index-*'], version: 1 } as RuleAlertType['params'];

  test('should increment version', () => {
    const editedRuleParams = ruleParamsModifier(ruleParamsMock, [
      {
        type: BulkActionEditType.add_index_patterns,
        value: ['my-index-*'],
      },
    ]);
    expect(editedRuleParams).toHaveProperty('version', ruleParamsMock.version + 1);
  });

  describe('index_patterns', () => {
    test('should add new index pattern to rule', () => {
      const editedRuleParams = ruleParamsModifier(ruleParamsMock, [
        {
          type: BulkActionEditType.add_index_patterns,
          value: ['my-index-*'],
        },
      ]);
      expect(editedRuleParams).toHaveProperty('index', ['initial-index-*', 'my-index-*']);
    });
    test('should remove index pattern from rule', () => {
      const editedRuleParams = ruleParamsModifier(
        { index: ['initial-index-*', 'index-2-*'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['index-2-*'],
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('index', ['initial-index-*']);
    });

    test('should return undefined index patterns on remove action if rule has dataViewId only', () => {
      const testDataViewId = 'test-data-view-id';
      const editedRuleParams = ruleParamsModifier(
        { dataViewId: testDataViewId } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['index-2-*'],
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('index', undefined);
      expect(editedRuleParams).toHaveProperty('dataViewId', testDataViewId);
    });

    test('should rewrite index pattern in rule', () => {
      const editedRuleParams = ruleParamsModifier(ruleParamsMock, [
        {
          type: BulkActionEditType.set_index_patterns,
          value: ['index'],
        },
      ]);
      expect(editedRuleParams).toHaveProperty('index', ['index']);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on set_index_patterns action', () => {
      const editedRuleParams = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.set_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('dataViewId', undefined);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on add_index_patterns action', () => {
      const editedRuleParams = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.add_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('dataViewId', undefined);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on delete_index_patterns action', () => {
      const editedRuleParams = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*', 'index'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('dataViewId', undefined);
      expect(editedRuleParams).toHaveProperty('index', ['test-*']);
    });

    test('should set dataViewId to undefined and index to undefined if overwrite_data_views=true on delete_index_patterns action and rule had no index patterns to begin with', () => {
      const editedRuleParams = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: undefined } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(editedRuleParams).toHaveProperty('dataViewId', undefined);
      expect(editedRuleParams).toHaveProperty('index', undefined);
    });

    test('should throw error on adding index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditType.add_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
      );
    });

    test('should throw error on deleting index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );
    });

    test('should throw error on overwriting index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditType.set_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );
    });
  });

  describe('timeline', () => {
    test('should set timeline', () => {
      const editedRuleParams = ruleParamsModifier(ruleParamsMock, [
        {
          type: BulkActionEditType.set_timeline,
          value: {
            timeline_id: '91832785-286d-4ebe-b884-1a208d111a70',
            timeline_title: 'Test timeline',
          },
        },
      ]);

      expect(editedRuleParams.timelineId).toBe('91832785-286d-4ebe-b884-1a208d111a70');
      expect(editedRuleParams.timelineTitle).toBe('Test timeline');
    });
  });
});
