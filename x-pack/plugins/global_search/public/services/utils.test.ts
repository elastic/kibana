/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StubBrowserStorage } from '../../../../../src/test_utils/public/stub_browser_storage';
import { applicationServiceMock } from '../../../../../src/core/public/mocks';
import { GlobalSearchResult } from '../../common/types';
import { addNavigate, getDefaultPreference } from './utils';

describe('addNavigate', () => {
  let navigateToUrl: ReturnType<typeof applicationServiceMock.createStartContract>['navigateToUrl'];

  const serverResult = (
    id: string,
    parts: Partial<GlobalSearchResult> = {}
  ): GlobalSearchResult => ({
    title: id,
    type: 'test',
    url: '/foo/bar',
    score: 100,
    ...parts,
    id,
  });

  beforeEach(() => {
    navigateToUrl = applicationServiceMock.createStartContract().navigateToUrl;
  });

  it('adds a `navigate` method to the result while keeping the other properties', () => {
    const result = serverResult('foo');
    expect(addNavigate(result, navigateToUrl)).toEqual({
      ...result,
      navigate: expect.any(Function),
    });
  });

  it('delegates to `navigateToUrl` when invoking `navigate`', () => {
    const result = addNavigate(serverResult('foo', { url: '/my-test-url' }), navigateToUrl);

    expect(navigateToUrl).not.toHaveBeenCalled();

    result.navigate();

    expect(navigateToUrl).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledWith('/my-test-url');
  });
});

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

    expect(storedPref).toEqual(returnedPref);
  });
});
