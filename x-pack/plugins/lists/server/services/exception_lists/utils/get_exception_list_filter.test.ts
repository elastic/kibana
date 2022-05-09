/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListFilter } from './get_exception_list_filter';

describe('getExceptionListFilter', () => {
  test('it should create a filter for agnostic lists if only searching for agnostic lists', () => {
    const filter = getExceptionListFilter({
      filter: undefined,
      savedObjectTypes: ['exception-list-agnostic'],
    });
    expect(filter).toEqual('(exception-list-agnostic.attributes.list_type: list)');
  });

  test('it should create a filter for agnostic lists with additional filters if only searching for agnostic lists', () => {
    const filter = getExceptionListFilter({
      filter: 'exception-list-agnostic.attributes.name: "Sample Endpoint Exception List"',
      savedObjectTypes: ['exception-list-agnostic'],
    });
    expect(filter).toEqual(
      '(exception-list-agnostic.attributes.list_type: list) AND exception-list-agnostic.attributes.name: "Sample Endpoint Exception List"'
    );
  });

  test('it should create a filter for single lists if only searching for single lists', () => {
    const filter = getExceptionListFilter({
      filter: undefined,
      savedObjectTypes: ['exception-list'],
    });
    expect(filter).toEqual('(exception-list.attributes.list_type: list)');
  });

  test('it should create a filter for single lists with additional filters if only searching for single lists', () => {
    const filter = getExceptionListFilter({
      filter: 'exception-list.attributes.name: "Sample Endpoint Exception List"',
      savedObjectTypes: ['exception-list'],
    });
    expect(filter).toEqual(
      '(exception-list.attributes.list_type: list) AND exception-list.attributes.name: "Sample Endpoint Exception List"'
    );
  });

  test('it should create a filter that searches for both agnostic and single lists', () => {
    const filter = getExceptionListFilter({
      filter: undefined,
      savedObjectTypes: ['exception-list-agnostic', 'exception-list'],
    });
    expect(filter).toEqual(
      '(exception-list-agnostic.attributes.list_type: list OR exception-list.attributes.list_type: list)'
    );
  });

  test('it should create a filter that searches for both agnostic and single lists with additional filters if searching for both single and agnostic lists', () => {
    const filter = getExceptionListFilter({
      filter: 'exception-list-agnostic.attributes.name: "Sample Endpoint Exception List"',
      savedObjectTypes: ['exception-list-agnostic', 'exception-list'],
    });
    expect(filter).toEqual(
      '(exception-list-agnostic.attributes.list_type: list OR exception-list.attributes.list_type: list) AND exception-list-agnostic.attributes.name: "Sample Endpoint Exception List"'
    );
  });
});
