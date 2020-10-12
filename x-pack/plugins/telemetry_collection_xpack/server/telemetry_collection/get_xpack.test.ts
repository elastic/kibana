/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getXPackUsage } from './get_xpack';

describe('get_xpack', () => {
  describe('getXPackUsage', () => {
    it('uses esClient to get /_xpack/usage API', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      // @ts-ignore we only care about the response body
      esClient.xpack.usage.mockResolvedValue({ body: {} });
      const result = await getXPackUsage(esClient);
      expect(result).toEqual({});
    });
  });
});
