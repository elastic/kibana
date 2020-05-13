/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertResultUrlMock } from './process_result.test.mocks';

import { ApplicationStart } from 'src/core/public';
import { IBasePath } from '../../common/utils';
import { GlobalSearchProviderResult } from '../../common/types';
import { getResultProcessor, ResultProcessor } from './process_result';

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

describe('getResultProcessor', () => {
  let processor: ResultProcessor;
  let navigateToUrl: jest.MockedFunction<ApplicationStart['navigateToUrl']>;
  let basePath: jest.Mocked<IBasePath>;

  beforeEach(() => {
    navigateToUrl = jest.fn();
    basePath = {
      prepend: jest.fn(),
    };
    processor = getResultProcessor({ basePath, navigateToUrl });

    convertResultUrlMock.mockClear();
  });

  it('returns all properties unchanged except `url`', () => {
    const r1 = createResult({
      id: '1',
      url: '/url-1',
      title: 'title 1',
      icon: 'foo',
      score: 69,
      meta: { hello: 'dolly' },
    });

    expect(r1).toEqual(
      expect.objectContaining({
        id: '1',
        url: '/url-1',
        title: 'title 1',
        icon: 'foo',
        score: 69,
        meta: { hello: 'dolly' },
      })
    );
  });

  it('converts the url using `convertResultUrl`', () => {
    const r1 = createResult({ id: '1', url: '/url-1' });
    const r2 = createResult({ id: '2', url: '/url-2' });

    expect(convertResultUrlMock).not.toHaveBeenCalled();

    processor(r1);

    expect(convertResultUrlMock).toHaveBeenCalledTimes(1);
    expect(convertResultUrlMock).toHaveBeenCalledWith(r1.url, basePath);

    processor(r2);

    expect(convertResultUrlMock).toHaveBeenCalledTimes(1);
    expect(convertResultUrlMock).toHaveBeenCalledWith(r2.url, basePath);
  });

  it('adds the `navigate` method that delegates to `navigateToUrl`', () => {
    const result = createResult({ url: '/some-url' });
    const processed = processor(result);

    expect(navigateToUrl).not.toHaveBeenCalled();

    processed.navigate();

    expect(navigateToUrl).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledWith('converted-url');
  });
});
