/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyBulkEditOperation } from './apply_bulk_edit_operation';
import type { Rule } from '../../types';

describe('applyBulkEditOperation', () => {
  describe('tags operations', () => {
    test('should add tag', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['add-tag'],
            operation: 'add',
          },
          ruleMock
        )
      ).toHaveProperty('tags', ['tag-1', 'tag-2', 'add-tag']);
    });

    test('should add multiple tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['add-tag-1', 'add-tag-2'],
            operation: 'add',
          },
          ruleMock
        )
      ).toHaveProperty('tags', ['tag-1', 'tag-2', 'add-tag-1', 'add-tag-2']);
    });

    test('should not have duplicated tags when added existed ones', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['tag-1', 'tag-3'],
            operation: 'add',
          },
          ruleMock
        )
      ).toHaveProperty('tags', ['tag-1', 'tag-2', 'tag-3']);
    });

    test('should delete tag', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['tag-1'],
            operation: 'delete',
          },
          ruleMock
        )
      ).toHaveProperty('tags', ['tag-2']);
    });

    test('should delete multiple tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['tag-1', 'tag-2'],
            operation: 'delete',
          },
          ruleMock
        )
      ).toHaveProperty('tags', []);
    });

    test('should rewrite tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'tags',
            value: ['rewrite-tag'],
            operation: 'set',
          },
          ruleMock
        )
      ).toHaveProperty('tags', ['rewrite-tag']);
    });
  });

  describe('actions operations', () => {
    test('should add actions', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'actions',
            value: [
              { id: 'mock-add-action-id-1', group: 'default', params: {} },
              { id: 'mock-add-action-id-2', group: 'default', params: {} },
            ],
            operation: 'add',
          },
          ruleMock
        )
      ).toHaveProperty('actions', [
        { id: 'mock-action-id', group: 'default', params: {} },
        { id: 'mock-add-action-id-1', group: 'default', params: {} },
        { id: 'mock-add-action-id-2', group: 'default', params: {} },
      ]);
    });

    test('should add action with different params and same id', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: { test: 1 } }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'actions',
            value: [{ id: 'mock-action-id', group: 'default', params: { test: 2 } }],
            operation: 'add',
          },
          ruleMock
        )
      ).toHaveProperty('actions', [
        { id: 'mock-action-id', group: 'default', params: { test: 1 } },
        { id: 'mock-action-id', group: 'default', params: { test: 2 } },
      ]);
    });

    test('should rewrite actions', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'actions',
            value: [{ id: 'mock-rewrite-action-id-1', group: 'default', params: {} }],
            operation: 'set',
          },
          ruleMock
        )
      ).toHaveProperty('actions', [
        { id: 'mock-rewrite-action-id-1', group: 'default', params: {} },
      ]);
    });
  });

  describe('throttle operations', () => {
    test('should rewrite throttle', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'throttle',
            value: '1d',
            operation: 'set',
          },
          ruleMock
        )
      ).toHaveProperty('throttle', '1d');
    });
  });

  describe('notifyWhen operations', () => {
    test('should rewrite notifyWhen', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'notifyWhen',
            value: 'onThrottleInterval',
            operation: 'set',
          },
          ruleMock
        )
      ).toHaveProperty('notifyWhen', 'onThrottleInterval');
    });
  });

  describe('schedule operations', () => {
    test('should rewrite schedule', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      expect(
        applyBulkEditOperation(
          {
            field: 'schedule',
            value: { interval: '1d' },
            operation: 'set',
          },
          ruleMock
        )
      ).toHaveProperty('schedule', { interval: '1d' });
    });
  });
});
