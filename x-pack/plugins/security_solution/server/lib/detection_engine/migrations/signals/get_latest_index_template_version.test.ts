/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getLatestIndexTemplateVersion } from './get_latest_index_template_version';

describe('getIndexAliasPerSpace', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns latest index template version', async () => {
    esClient.indices.getIndexTemplate.mockResponseOnce({
      index_templates: [
        { index_template: { version: 77 } },
        { index_template: { version: 10 } },
        { index_template: { version: 23 } },
        { index_template: { version: 0 } },
      ],
    } as IndicesGetIndexTemplateResponse);

    const version = await getLatestIndexTemplateVersion({
      esClient,
      name: '.siem-signals-*',
    });

    expect(version).toBe(77);
  });

  it('returns 0 if templates empty', async () => {
    esClient.indices.getIndexTemplate.mockResponseOnce({
      index_templates: [],
    });

    const version = await getLatestIndexTemplateVersion({
      esClient,
      name: '.siem-signals-*',
    });

    expect(version).toBe(0);
  });

  it('returns 0 if request fails', async () => {
    esClient.indices.getIndexTemplate.mockRejectedValueOnce('Failure');

    const version = await getLatestIndexTemplateVersion({
      esClient,
      name: '.siem-signals-*',
    });

    expect(version).toBe(0);
  });
});
