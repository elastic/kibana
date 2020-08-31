/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hasLargeValueList, hasNestedEntry } from './utils';
import { EntriesArray } from '../shared_imports';

describe('#hasLargeValueList', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasLargeValueList([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryList exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'list',
        operator: 'included',
        list: { id: 'some id', type: 'ip' },
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryList does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeFalsy();
  });
});

describe('#hasNestedEntry', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasNestedEntry([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryNested exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'nested',
        entries: [
          { field: 'some field', type: 'match', operator: 'included', value: 'some value' },
        ],
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryNested does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeFalsy();
  });
});
