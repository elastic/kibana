/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addItemsToArray,
  deleteItemsFromArray,
  applyBulkActionEditToRule,
} from './bulk_action_edit';
import { BulkActionEditType } from '../../../../common/detection_engine/schemas/common/schemas';
import { RuleAlertType } from './types';
describe('bulk_action_edit', () => {
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

  describe('applyBulkActionEditToRule', () => {
    const ruleMock = {
      tags: ['tag1', 'tag2'],
      params: { index: ['initial-index-*'] },
    };
    describe('tags', () => {
      test('should add new tags to rule', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.add_tags,
          value: ['new_tag'],
        });
        expect(editedRule.tags).toEqual(['tag1', 'tag2', 'new_tag']);
      });
      test('should remove tag from rule', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.delete_tags,
          value: ['tag1'],
        });
        expect(editedRule.tags).toEqual(['tag2']);
      });

      test('should rewrite tags in rule', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.set_tags,
          value: ['tag_r_1', 'tag_r_2'],
        });
        expect(editedRule.tags).toEqual(['tag_r_1', 'tag_r_2']);
      });
    });

    describe('index_patterns', () => {
      test('should add new index pattern to rule', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.add_index_patterns,
          value: ['my-index-*'],
        });
        expect(editedRule.params).toHaveProperty('index', ['initial-index-*', 'my-index-*']);
      });
      test('should remove index pattern from rule', () => {
        const editedRule = applyBulkActionEditToRule(
          { params: { index: ['initial-index-*', 'index-2-*'] } } as RuleAlertType,
          {
            type: BulkActionEditType.delete_index_patterns,
            value: ['index-2-*'],
          }
        );
        expect(editedRule.params).toHaveProperty('index', ['initial-index-*']);
      });

      test('should rewrite index  pattern in rule', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.set_index_patterns,
          value: ['index'],
        });
        expect(editedRule.params).toHaveProperty('index', ['index']);
      });

      test('should throw error on adding index pattern if rule is of machine learning type', () => {
        expect(() =>
          applyBulkActionEditToRule({ params: { type: 'machine_learning' } } as RuleAlertType, {
            type: BulkActionEditType.add_index_patterns,
            value: ['my-index-*'],
          })
        ).toThrow(
          "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
        );
      });

      test('should throw error on deleting index pattern if rule is of machine learning type', () => {
        expect(() =>
          applyBulkActionEditToRule({ params: { type: 'machine_learning' } } as RuleAlertType, {
            type: BulkActionEditType.delete_index_patterns,
            value: ['my-index-*'],
          })
        ).toThrow(
          "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
        );
      });

      test('should throw error on overwriting index pattern if rule is of machine learning type', () => {
        expect(() =>
          applyBulkActionEditToRule({ params: { type: 'machine_learning' } } as RuleAlertType, {
            type: BulkActionEditType.set_index_patterns,
            value: ['my-index-*'],
          })
        ).toThrow(
          "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
        );
      });

      test('should throw error if all index patterns are deleted', () => {
        expect(() =>
          applyBulkActionEditToRule({ params: { index: ['my-index-*'] } } as RuleAlertType, {
            type: BulkActionEditType.delete_index_patterns,
            value: ['my-index-*'],
          })
        ).toThrow("Can't delete all index patterns. At least one index pattern must be left");
      });

      test('should throw error if all index patterns are rewritten with empty list', () => {
        expect(() =>
          applyBulkActionEditToRule({ params: { index: ['my-index-*'] } } as RuleAlertType, {
            type: BulkActionEditType.set_index_patterns,
            value: [],
          })
        ).toThrow("Index patterns can't be overwritten with empty list");
      });
    });

    describe('timeline', () => {
      test('should set timeline', () => {
        const editedRule = applyBulkActionEditToRule(ruleMock as RuleAlertType, {
          type: BulkActionEditType.set_timeline,
          value: {
            timeline_id: '91832785-286d-4ebe-b884-1a208d111a70',
            timeline_title: 'Test timeline',
          },
        });

        expect(editedRule.params.timelineId).toBe('91832785-286d-4ebe-b884-1a208d111a70');
        expect(editedRule.params.timelineTitle).toBe('Test timeline');
      });
    });
  });
});
