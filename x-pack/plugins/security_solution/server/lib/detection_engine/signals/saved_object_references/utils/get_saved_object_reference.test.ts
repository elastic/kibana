/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { SavedObjectReference } from 'src/core/server';
import { getSavedObjectReference } from '.';

describe('get_saved_object_reference', () => {
  type FuncReturn = ReturnType<typeof getSavedObjectReference>;
  const mockSavedObjectReferences = (): SavedObjectReference[] => [
    {
      id: '123',
      name: 'test_0',
      type: 'some-type',
    },
  ];
  let logger = loggingSystemMock.create().get('security_solution');

  beforeEach(() => {
    logger = loggingSystemMock.create().get('security_solution');
  });

  test('returns reference found, given index zero', () => {
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 0,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(mockSavedObjectReferences()[0]);
  });

  test('returns reference found, given positive index', () => {
    const savedObjectReferences: SavedObjectReference[] = [
      mockSavedObjectReferences()[0],
      {
        id: '345',
        name: 'test_1',
        type: 'some-type',
      },
    ];
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 1,
        savedObjectReferences,
      })
    ).toEqual<FuncReturn>(savedObjectReferences[1]);
  });

  test('returns undefined, given index larger than the size of object references', () => {
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 100,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toEqual<FuncReturn>(undefined);
  });

  test('returns undefined, when it cannot find the reference', () => {
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 0,
        savedObjectReferences: [{ ...mockSavedObjectReferences()[0], name: 'other-name_0' }],
      })
    ).toEqual<FuncReturn>(undefined);
  });

  test('returns found reference, even if the reference is mixed with other references', () => {
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 0,
        savedObjectReferences: [
          { ...mockSavedObjectReferences()[0], name: 'other-name_0' },
          mockSavedObjectReferences()[0],
        ],
      })
    ).toEqual<FuncReturn>(mockSavedObjectReferences()[0]);
  });

  test('returns found reference, even if the reference is mixed with other references and has an index of 1', () => {
    const additionalException: SavedObjectReference = {
      ...mockSavedObjectReferences()[0],
      name: 'test_1',
    };
    expect(
      getSavedObjectReference({
        name: 'test',
        logger,
        index: 1,
        savedObjectReferences: [
          { ...mockSavedObjectReferences()[0], name: 'other-name_0' },
          mockSavedObjectReferences()[0],
          additionalException,
        ],
      })
    ).toEqual<FuncReturn>(additionalException);
  });

  test('throws given less than zero', () => {
    expect(() =>
      getSavedObjectReference({
        name: 'test',
        logger,
        index: -1,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toThrow('"index" should alway be >= 0 instead of: -1');
  });

  test('throws given NaN', () => {
    expect(() =>
      getSavedObjectReference({
        name: 'test',
        logger,
        index: NaN,
        savedObjectReferences: mockSavedObjectReferences(),
      })
    ).toThrow('"index" should alway be >= 0 instead of: NaN');
  });
});
