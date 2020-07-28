/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertResultUrlMock } from './process_result.test.mocks';

import { IBasePath } from './utils';
import { GlobalSearchProviderResult } from './types';
import { processProviderResult } from './process_result';

const createResult = (parts: Partial<GlobalSearchProviderResult>): GlobalSearchProviderResult => ({
  id: 'id',
  title: 'title',
  type: 'type',
  icon: 'icon',
  url: '/foo/bar',
  score: 42,
  meta: { foo: 'bar' },
  ...parts,
});

describe('processProviderResult', () => {
  let basePath: jest.Mocked<IBasePath>;

  beforeEach(() => {
    basePath = {
      prepend: jest.fn(),
    };

    convertResultUrlMock.mockClear();
  });

  it('returns all properties unchanged except `url`', () => {
    const r1 = createResult({
      id: '1',
      type: 'test',
      url: '/url-1',
      title: 'title 1',
      icon: 'foo',
      score: 69,
      meta: { hello: 'dolly' },
    });

    expect(processProviderResult(r1, basePath)).toEqual({
      ...r1,
      url: expect.any(String),
    });
  });

  it('converts the url using `convertResultUrl`', () => {
    const r1 = createResult({ id: '1', url: '/url-1' });
    const r2 = createResult({ id: '2', url: '/url-2' });

    convertResultUrlMock.mockReturnValueOnce('/url-A');
    convertResultUrlMock.mockReturnValueOnce('/url-B');

    expect(convertResultUrlMock).not.toHaveBeenCalled();

    const g1 = processProviderResult(r1, basePath);

    expect(g1.url).toEqual('/url-A');
    expect(convertResultUrlMock).toHaveBeenCalledTimes(1);
    expect(convertResultUrlMock).toHaveBeenCalledWith(r1.url, basePath);

    const g2 = processProviderResult(r2, basePath);

    expect(g2.url).toEqual('/url-B');
    expect(convertResultUrlMock).toHaveBeenCalledTimes(2);
    expect(convertResultUrlMock).toHaveBeenCalledWith(r2.url, basePath);
  });
});
