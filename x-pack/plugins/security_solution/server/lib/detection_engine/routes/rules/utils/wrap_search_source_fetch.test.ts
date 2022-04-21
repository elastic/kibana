/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { wrapSearchSourceFetch } from './wrap_search_source_fetch';

describe('wrapSearchSourceFetch', () => {
  test('searches properly', async () => {
    const abortController = new AbortController();

    const wrappedSearchSourceFetch = wrapSearchSourceFetch(abortController);
    wrappedSearchSourceFetch(searchSourceInstanceMock);

    expect(searchSourceInstanceMock.fetch).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
    });
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();

    (searchSourceInstanceMock.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('something went wrong!')
    );

    const wrappedFetch = wrapSearchSourceFetch(abortController);

    await expect(
      wrappedFetch.bind({}, searchSourceInstanceMock)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong!"`);
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();

    (searchSourceInstanceMock.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Request has been aborted by the user')
    );

    const wrappedFetch = wrapSearchSourceFetch(abortController);

    await expect(
      wrappedFetch.bind({}, searchSourceInstanceMock)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Search has been aborted due to cancelled execution"`
    );
  });
});
