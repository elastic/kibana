/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applicationServiceMock } from '../../../../../src/core/public/mocks';
import { GlobalSearchResult } from '../../common/types';
import { addNavigate } from './utils';

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
