/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '../../../../../../src/core/server/elasticsearch/client/mocks';

export const mockCountResultOnce = async (mockEsClient: ElasticsearchClientMock, count: number) => {
  mockEsClient.count.mockReturnValueOnce(
    // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
    elasticsearchClientMock.createSuccessTransportRequestPromise({ count })
  );
};

export const mockSearchResultOnce = async (
  mockEsClient: ElasticsearchClientMock,
  returnedMock: object
) => {
  mockEsClient.search.mockReturnValueOnce(
    // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
    elasticsearchClientMock.createSuccessTransportRequestPromise(returnedMock)
  );
};
