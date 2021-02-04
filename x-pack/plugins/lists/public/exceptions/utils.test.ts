/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilters, getGeneralFilters, getIdsAndNamespaces, getTrustedAppsFilter } from './utils';

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

  describe('getGeneralFilters', () => {
    test('it returns empty string if no filters', () => {
      const filters = getGeneralFilters({}, ['exception-list']);

      expect(filters).toEqual('');
    });

    test('it properly formats filters when one namespace type passed in', () => {
      const filters = getGeneralFilters({ created_by: 'moi', name: 'Sample' }, ['exception-list']);

      expect(filters).toEqual(
        '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name:Sample)'
      );
    });

    test('it properly formats filters when two namespace types passed in', () => {
      const filters = getGeneralFilters({ created_by: 'moi', name: 'Sample' }, [
        'exception-list',
        'exception-list-agnostic',
      ]);

      expect(filters).toEqual(
        '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name:Sample OR exception-list-agnostic.attributes.name:Sample)'
      );
    });
  });

  describe('getTrustedAppsFilter', () => {
    test('it returns filter to search for "exception-list" namespace trusted apps', () => {
      const filter = getTrustedAppsFilter(true, ['exception-list']);

      expect(filter).toEqual('(exception-list.attributes.list_id: endpoint_trusted_apps*)');
    });

    test('it returns filter to search for "exception-list" and "agnostic" namespace trusted apps', () => {
      const filter = getTrustedAppsFilter(true, ['exception-list', 'exception-list-agnostic']);

      expect(filter).toEqual(
        '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
      );
    });

    test('it returns filter to exclude "exception-list" namespace trusted apps', () => {
      const filter = getTrustedAppsFilter(false, ['exception-list']);

      expect(filter).toEqual('(not exception-list.attributes.list_id: endpoint_trusted_apps*)');
    });

    test('it returns filter to exclude "exception-list" and "agnostic" namespace trusted apps', () => {
      const filter = getTrustedAppsFilter(false, ['exception-list', 'exception-list-agnostic']);

      expect(filter).toEqual(
        '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
      );
    });
  });

  describe('getFilters', () => {
    describe('single', () => {
      test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters({}, ['single'], false);

        expect(filter).toEqual('(not exception-list.attributes.list_id: endpoint_trusted_apps*)');
      });

      test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters({}, ['single'], true);

        expect(filter).toEqual('(exception-list.attributes.list_id: endpoint_trusted_apps*)');
      });

      test('it properly formats when filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], false);

        expect(filter).toEqual(
          '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it if filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['single'], true);

        expect(filter).toEqual(
          '(exception-list.attributes.created_by:moi) AND (exception-list.attributes.name:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps*)'
        );
      });
    });

    describe('agnostic', () => {
      test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters({}, ['agnostic'], false);

        expect(filter).toEqual(
          '(not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters({}, ['agnostic'], true);

        expect(filter).toEqual(
          '(exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it properly formats when filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], false);

        expect(filter).toEqual(
          '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name:Sample) AND (not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it if filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters({ created_by: 'moi', name: 'Sample' }, ['agnostic'], true);

        expect(filter).toEqual(
          '(exception-list-agnostic.attributes.created_by:moi) AND (exception-list-agnostic.attributes.name:Sample) AND (exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });
    });

    describe('single, agnostic', () => {
      test('it properly formats when no filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters({}, ['single', 'agnostic'], false);

        expect(filter).toEqual(
          '(not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it properly formats when no filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters({}, ['single', 'agnostic'], true);

        expect(filter).toEqual(
          '(exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it properly formats when filters passed and "showTrustedApps" is false', () => {
        const filter = getFilters(
          { created_by: 'moi', name: 'Sample' },
          ['single', 'agnostic'],
          false
        );

        expect(filter).toEqual(
          '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name:Sample OR exception-list-agnostic.attributes.name:Sample) AND (not exception-list.attributes.list_id: endpoint_trusted_apps* AND not exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });

      test('it properly formats when filters passed and "showTrustedApps" is true', () => {
        const filter = getFilters(
          { created_by: 'moi', name: 'Sample' },
          ['single', 'agnostic'],
          true
        );

        expect(filter).toEqual(
          '(exception-list.attributes.created_by:moi OR exception-list-agnostic.attributes.created_by:moi) AND (exception-list.attributes.name:Sample OR exception-list-agnostic.attributes.name:Sample) AND (exception-list.attributes.list_id: endpoint_trusted_apps* OR exception-list-agnostic.attributes.list_id: endpoint_trusted_apps*)'
        );
      });
    });
  });
});
