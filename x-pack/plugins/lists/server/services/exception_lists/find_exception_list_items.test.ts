/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID } from '../../../common/constants.mock';

import { getExceptionListsItemFilter } from './find_exception_list_items';

describe('find_exception_list_items', () => {
  describe('getExceptionListsItemFilter', () => {
    test('It should create a filter with a single listId with an empty filter', () => {
      const filter = getExceptionListsItemFilter({
        filter: [],
        listId: [LIST_ID],
        savedObjectType: ['exception-list'],
      });
      expect(filter).toEqual(
        '(exception-list.attributes.list_type: item AND exception-list.attributes.list_id: some-list-id)'
      );
    });

    test('It should create a filter with a single listId with a single filter', () => {
      const filter = getExceptionListsItemFilter({
        filter: ['exception-list.attributes.name: "Sample Endpoint Exception List"'],
        listId: [LIST_ID],
        savedObjectType: ['exception-list'],
      });
      expect(filter).toEqual(
        '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: some-list-id) AND exception-list.attributes.name: "Sample Endpoint Exception List")'
      );
    });

    test('It should create a filter with 2 listIds and an empty filter', () => {
      const filter = getExceptionListsItemFilter({
        filter: [],
        listId: ['list-1', 'list-2'],
        savedObjectType: ['exception-list', 'exception-list-agnostic'],
      });
      expect(filter).toEqual(
        '(exception-list.attributes.list_type: item AND exception-list.attributes.list_id: list-1) OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-2)'
      );
    });

    test('It should create a filter with 2 listIds and a single filter', () => {
      const filter = getExceptionListsItemFilter({
        filter: ['exception-list.attributes.name: "Sample Endpoint Exception List"'],
        listId: ['list-1', 'list-2'],
        savedObjectType: ['exception-list', 'exception-list-agnostic'],
      });
      expect(filter).toEqual(
        '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: list-1) AND exception-list.attributes.name: "Sample Endpoint Exception List") OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-2)'
      );
    });

    test('It should create a filter with 3 listIds and an empty filter', () => {
      const filter = getExceptionListsItemFilter({
        filter: [],
        listId: ['list-1', 'list-2', 'list-3'],
        savedObjectType: ['exception-list', 'exception-list-agnostic', 'exception-list-agnostic'],
      });
      expect(filter).toEqual(
        '(exception-list.attributes.list_type: item AND exception-list.attributes.list_id: list-1) OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-2) OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-3)'
      );
    });

    test('It should create a filter with 3 listIds and a single filter for the first item', () => {
      const filter = getExceptionListsItemFilter({
        filter: ['exception-list.attributes.name: "Sample Endpoint Exception List"'],
        listId: ['list-1', 'list-2', 'list-3'],
        savedObjectType: ['exception-list', 'exception-list-agnostic', 'exception-list-agnostic'],
      });
      expect(filter).toEqual(
        '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: list-1) AND exception-list.attributes.name: "Sample Endpoint Exception List") OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-2) OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-3)'
      );
    });

    test('It should create a filter with 3 listIds and 3 filters for each', () => {
      const filter = getExceptionListsItemFilter({
        filter: [
          'exception-list.attributes.name: "Sample Endpoint Exception List 1"',
          'exception-list.attributes.name: "Sample Endpoint Exception List 2"',
          'exception-list.attributes.name: "Sample Endpoint Exception List 3"',
        ],
        listId: ['list-1', 'list-2', 'list-3'],
        savedObjectType: ['exception-list', 'exception-list-agnostic', 'exception-list-agnostic'],
      });
      expect(filter).toEqual(
        '((exception-list.attributes.list_type: item AND exception-list.attributes.list_id: list-1) AND exception-list.attributes.name: "Sample Endpoint Exception List 1") OR ((exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-2) AND exception-list.attributes.name: "Sample Endpoint Exception List 2") OR ((exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.list_id: list-3) AND exception-list.attributes.name: "Sample Endpoint Exception List 3")'
      );
    });
  });
});
