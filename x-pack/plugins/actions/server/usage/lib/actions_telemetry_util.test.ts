/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInMemoryActions,
  getActions,
  getActionExecutions,
  getActionsCount,
} from './actions_telemetry_util';

describe('Actions Telemetry Util', () => {
  describe('getInMemoryActions', () => {
    test('should correctly parse in memory action bucket results', () => {
      expect(
        getInMemoryActions([
          {
            key: ['preconfigured:preconfigured-alert-history-es-index', '.index'],
            key_as_string: 'preconfigured:preconfigured-alert-history-es-index|.index',
            doc_count: 1,
          },
          {
            key: ['system_action:test', '.index'],
            key_as_string: 'system_action:test|.index',
            doc_count: 1,
          },
          {
            key: ['test:test', '.index'],
            key_as_string: 'test:test|.index',
            doc_count: 1,
          },
        ])
      ).toEqual({
        preconfiguredActionsAggs: {
          actionRefs: {
            'preconfigured:preconfigured-alert-history-es-index': {
              actionRef: 'preconfigured:preconfigured-alert-history-es-index',
              actionTypeId: '.index',
            },
          },
          total: 1,
        },
        systemActionsAggs: {
          actionRefs: {
            'system_action:test': {
              actionRef: 'system_action:test',
              actionTypeId: '.index',
            },
          },
          total: 1,
        },
      });
    });
  });
  describe('getActions', () => {
    test('should correctly parse action bucket results', () => {
      expect(
        getActions([
          {
            key: ['1', 'action-0'],
            key_as_string: '1|action-0',
            doc_count: 1,
          },
          {
            key: ['123', 'action-1'],
            key_as_string: '123|action-1',
            doc_count: 1,
          },
          {
            key: ['456', 'action-2'],
            key_as_string: '456|action-2',
            doc_count: 1,
          },
        ])
      ).toEqual({
        connectorIds: {
          '1': 'action-0',
          '123': 'action-1',
          '456': 'action-2',
        },
        total: 3,
      });
    });
  });
  describe('getActionExecutions', () => {
    test('should correctly parse action execution bucket results', () => {
      expect(
        getActionExecutions([
          {
            key: '.server-log',
            doc_count: 20,
          },
          {
            key: '.slack',
            doc_count: 100,
          },
        ])
      ).toEqual({
        connectorTypes: {
          '.server-log': 20,
          '.slack': 100,
        },
        total: 120,
      });
    });
  });
  describe('getActionsCount', () => {
    test('should correctly parse action count bucket results', () => {
      expect(
        getActionsCount([
          { key: '.index', doc_count: 1 },
          { key: '.server-log', doc_count: 3 },
          { key: 'some.type', doc_count: 2 },
          { key: 'another.type.', doc_count: 4 },
        ])
      ).toEqual({
        '.index': 1,
        '.server-log': 3,
        'another.type.': 4,
        'some.type': 2,
      });
    });
  });
});
