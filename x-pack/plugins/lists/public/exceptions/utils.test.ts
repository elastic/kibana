/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIdsAndNamespaces } from './utils';

describe('Exceptions utils', () => {
  describe('#getIdsAndNamespaces', () => {
    test('it returns empty arrays if no lists found', async () => {
      const output = getIdsAndNamespaces({
        lists: [],
        showDetection: false,
        showEndpoint: false,
      });

      expect(output).toEqual({ ids: [], namespaces: [] });
    });

    test('it returns all lists if "showDetection" and "showEndpoint" are "false"', async () => {
      const output = getIdsAndNamespaces({
        lists: [
          { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          {
            id: 'myListIdEndpoint',
            listId: 'list_id_endpoint',
            namespaceType: 'agnostic',
            type: 'endpoint',
          },
        ],
        showDetection: false,
        showEndpoint: false,
      });

      expect(output).toEqual({
        ids: ['list_id', 'list_id_endpoint'],
        namespaces: ['single', 'agnostic'],
      });
    });

    test('it returns only detections lists if "showDetection" is "true"', async () => {
      const output = getIdsAndNamespaces({
        lists: [
          { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          {
            id: 'myListIdEndpoint',
            listId: 'list_id_endpoint',
            namespaceType: 'agnostic',
            type: 'endpoint',
          },
        ],
        showDetection: true,
        showEndpoint: false,
      });

      expect(output).toEqual({
        ids: ['list_id'],
        namespaces: ['single'],
      });
    });

    test('it returns only endpoint lists if "showEndpoint" is "true"', async () => {
      const output = getIdsAndNamespaces({
        lists: [
          { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          {
            id: 'myListIdEndpoint',
            listId: 'list_id_endpoint',
            namespaceType: 'agnostic',
            type: 'endpoint',
          },
        ],
        showDetection: false,
        showEndpoint: true,
      });

      expect(output).toEqual({
        ids: ['list_id_endpoint'],
        namespaces: ['agnostic'],
      });
    });

    test('it returns only detection lists if both "showEndpoint" and "showDetection" are "true"', async () => {
      const output = getIdsAndNamespaces({
        lists: [
          { id: 'myListId', listId: 'list_id', namespaceType: 'single', type: 'detection' },
          {
            id: 'myListIdEndpoint',
            listId: 'list_id_endpoint',
            namespaceType: 'agnostic',
            type: 'endpoint',
          },
        ],
        showDetection: true,
        showEndpoint: true,
      });

      expect(output).toEqual({
        ids: ['list_id'],
        namespaces: ['single'],
      });
    });
  });
});
