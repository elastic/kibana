/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { ElasticsearchClient } from 'src/core/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { ContentStream } from './content_stream';

describe('ContentStream', () => {
  let client: jest.Mocked<ElasticsearchClient>;
  let stream: ContentStream;

  beforeEach(() => {
    client = elasticsearchServiceMock.createClusterClient().asInternalUser;
    stream = new ContentStream(client, { id: 'something', index: 'somewhere' });

    client.search.mockResolvedValue(
      set<any>({}, 'body.hits.hits.0._source.output.content', 'some content')
    );
  });

  describe('read', () => {
    it('should perform a search using index and the document id', async () => {
      await new Promise((resolve) => stream.once('data', resolve));

      expect(client.search).toHaveBeenCalledTimes(1);

      const [[request]] = client.search.mock.calls;
      expect(request).toHaveProperty('index', 'somewhere');
      expect(request).toHaveProperty(
        'body.query.constant_score.filter.bool.must.0.term._id',
        'something'
      );
    });

    it('should read the document contents', async () => {
      const data = await new Promise((resolve) => stream.once('data', resolve));

      expect(data).toEqual(Buffer.from('some content'));
    });

    it('should be an empty stream on empty response', async () => {
      client.search.mockResolvedValueOnce({ body: {} } as any);
      const onData = jest.fn();

      stream.on('data', onData);
      await new Promise((resolve) => stream.once('end', resolve));

      expect(onData).not.toHaveBeenCalled();
    });

    it('should emit an error event', async () => {
      client.search.mockRejectedValueOnce('some error');

      stream.read();
      const error = await new Promise((resolve) => stream.once('error', resolve));

      expect(error).toBe('some error');
    });
  });

  describe('toString', () => {
    it('should return the document contents', async () => {
      await expect(stream.toString()).resolves.toBe('some content');
    });

    it('should return an empty string for the empty document', async () => {
      client.search.mockResolvedValueOnce({ body: {} } as any);

      await expect(stream.toString()).resolves.toBe('');
    });
  });
});
