/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { wrapSearchSourceFetch } from './wrap_search_source_fetch';

const logger = loggingSystemMock.create().get();

const rule = {
  name: 'test-rule',
  alertTypeId: '.test-rule-type',
  id: 'abcdefg',
  spaceId: 'my-space',
};

describe('wrapSearchSourceFetch', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('searches properly', async () => {
    const abortController = new AbortController();

    const { fetch: wrappedFetch } = wrapSearchSourceFetch({ logger, rule, abortController });
    wrappedFetch(searchSourceInstanceMock);

    expect(searchSourceInstanceMock.fetch).toHaveBeenCalledWith({
      abortSignal: abortController.signal,
    });
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();

    (searchSourceInstanceMock.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('something went wrong!')
    );
    const { fetch: wrappedFetch } = wrapSearchSourceFetch({ logger, rule, abortController });

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

    const { fetch: wrappedFetch } = wrapSearchSourceFetch({ logger, rule, abortController });

    await expect(
      wrappedFetch.bind({}, searchSourceInstanceMock)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Search has been aborted due to cancelled execution"`
    );
  });

  test('keeps track of number of queries', async () => {
    const abortController = new AbortController();
    abortController.abort();

    (searchSourceInstanceMock.fetch as jest.Mock).mockResolvedValue({ took: 333 });

    const { fetch: wrappedFetch, getMetrics } = wrapSearchSourceFetch({
      logger,
      rule,
      abortController,
    });

    await wrappedFetch(searchSourceInstanceMock);
    await wrappedFetch(searchSourceInstanceMock);
    await wrappedFetch(searchSourceInstanceMock);

    expect(searchSourceInstanceMock.fetch).toHaveBeenCalledTimes(3);

    const stats = getMetrics();
    expect(stats.numSearchSourceSearches).toEqual(3);
    expect(stats.esSearchDurationMs).toEqual(999);

    expect(logger.debug).toHaveBeenCalledWith(
      'executing query for rule .test-rule-type:abcdefg in space my-space'
    );
  });
});
