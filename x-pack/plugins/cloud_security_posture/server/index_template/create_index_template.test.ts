/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { createFindingsIndexTemplate } from './create_index_template';
const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
afterEach(() => {
  mockEsClient.indices.putIndexTemplate.mockClear();
  mockEsClient.indices.existsIndexTemplate.mockClear();
});
describe('create index template for findings', () => {
  it('expect to find existing template', async () => {
    mockEsClient.indices.existsIndexTemplate.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(true)
    );
    const response = await createFindingsIndexTemplate(mockEsClient);
    expect(mockEsClient.indices.putIndexTemplate.mock.calls.length).toEqual(0);
    expect(response).toEqual(true);
  });

  it('expect to valid request', async () => {
    mockEsClient.indices.existsIndexTemplate.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(false)
    );
    mockEsClient.indices.putIndexTemplate.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({ acknowledged: true })
    );
    const response = await createFindingsIndexTemplate(mockEsClient);
    await expect(response).toEqual(true);
  });
});
