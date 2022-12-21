/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { getDefaultPreference } from './utils';

describe('getDefaultPreference', () => {
  let storage: Storage;
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;

  beforeEach(() => {
    storage = new StubBrowserStorage();
    getItemSpy = jest.spyOn(storage, 'getItem');
    setItemSpy = jest.spyOn(storage, 'setItem');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the value in storage when available', () => {
    getItemSpy.mockReturnValue('foo_pref');

    const pref = getDefaultPreference(storage);

    expect(pref).toEqual('foo_pref');
    expect(getItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('sets the value to the storage and return it when not already present', () => {
    getItemSpy.mockReturnValue(null);

    const returnedPref = getDefaultPreference(storage);

    expect(getItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    const storedPref = setItemSpy.mock.calls[0][1];

    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe('globalSearch:defaultPref');
    expect(storedPref).toEqual(returnedPref);
  });
});
