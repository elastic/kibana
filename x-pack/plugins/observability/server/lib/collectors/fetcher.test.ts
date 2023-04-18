/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';

let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;

let closeMock: jest.Mock;
let esClient: ElasticsearchClientMock;

describe('SLO usage collector fetcher', () => {
  beforeEach(() => {
    savedObjectClient = savedObjectsRepositoryMock.create();
    closeMock = jest.fn();
  });

  it('without any existing slo', async () => {
    savedObjectClient.createPointInTimeFinder.mockReturnValue({
      find: async function* find() {
        return {
          [Symbol.asyncIterator]: async () => {},
          next: () => {},
        };
      },
      close: closeMock,
    });

    const results = await fetcher({
      soClient: savedObjectClient,
      esClient,
    } as CollectorFetchContext);

    expect(closeMock).toHaveBeenCalled();
    expect(results.slo.total).toEqual(0);
  });
});
