/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addItemsToArray,
  deleteItemsFromArray,
  appplyBulkActionUpdateToRule,
} from './bulk_action_update';
import { BulkActionUpdateType } from '../../../../common/detection_engine/schemas/common/schemas';

describe('bulk_action_update', () => {
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

  describe('appplyBulkActionUpdateToRule', () => {
    const ruleMock = {
      tags: ['tag1', 'tag2'],
    };

    test('should add new tags to rule', () => {
      const updatedRule = appplyBulkActionUpdateToRule(ruleMock, {
        type: BulkActionUpdateType.add_tags,
        value: ['new_tag'],
      });
      expect(updatedRule.tags).toEqual(['tag1', 'tag2', 'new_tag']);
    });
    test('should remove tag from rule', () => {
      const updatedRule = appplyBulkActionUpdateToRule(ruleMock, {
        type: BulkActionUpdateType.delete_tags,
        value: ['tag1'],
      });
      expect(updatedRule.tags).toEqual(['tag2']);
    });

    test('should rewrite tags in rule', () => {
      const updatedRule = appplyBulkActionUpdateToRule(ruleMock, {
        type: BulkActionUpdateType.set_tags,
        value: ['tag_r_1', 'tag_r_2'],
      });
      expect(updatedRule.tags).toEqual(['tag_r_1', 'tag_r_2']);
    });

    test('should set timeline', () => {
      const updatedRule = appplyBulkActionUpdateToRule(ruleMock, {
        type: BulkActionUpdateType.set_timeline,
        value: {
          timelineId: '91832785-286d-4ebe-b884-1a208d111a70',
          timelineTitle: 'Test timeline',
        },
      });

      expect(updatedRule.timeline_id).toBe('91832785-286d-4ebe-b884-1a208d111a70');
      expect(updatedRule.timeline_title).toBe('Test timeline');
    });
  });
});
