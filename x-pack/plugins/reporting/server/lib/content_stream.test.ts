/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { set } from 'lodash';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ContentStream } from './content_stream';

describe('ContentStream', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: Logger;
  let stream: ContentStream;
  let base64Stream: ContentStream;

  beforeEach(() => {
    client = elasticsearchServiceMock.createClusterClient().asInternalUser;
    logger = loggingSystemMock.createLogger();
    stream = new ContentStream(
      client,
      logger,
      {
        id: 'something',
        index: 'somewhere',
      },
      { encoding: 'raw' }
    );
    base64Stream = new ContentStream(client, logger, {
      id: 'something',
      index: 'somewhere',
    });

    client.search.mockResponse(
      set<any>({}, 'hits.hits.0._source', {
        jobtype: 'pdf',
        output: {
          content: 'some content',
          size: 12,
        },
      })
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
      client.search.mockResponseOnce({} as any);
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

    it('should decode base64 encoded content', async () => {
      client.search.mockResponseOnce(
        set<any>(
          {},
          'hits.hits.0._source.output.content',
          Buffer.from('encoded content').toString('base64')
        )
      );
      const data = await new Promise((resolve) => base64Stream.once('data', resolve));

      expect(data).toEqual(Buffer.from('encoded content'));
    });

    it('should compound content from multiple chunks', async () => {
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source', {
          jobtype: 'pdf',
          output: {
            content: '12',
            size: 6,
          },
        })
      );
      client.search.mockResponseOnce(set<any>({}, 'hits.hits.0._source.output.content', '34'));
      client.search.mockResponseOnce(set<any>({}, 'hits.hits.0._source.output.content', '56'));
      let data = '';
      for await (const chunk of stream) {
        data += chunk;
      }

      expect(data).toEqual('123456');
      expect(client.search).toHaveBeenCalledTimes(3);

      const [[request1], [request2], [request3]] = client.search.mock.calls;

      expect(request1).toHaveProperty(
        'body.query.constant_score.filter.bool.must.0.term._id',
        'something'
      );
      expect(request2).toHaveProperty('index', 'somewhere');
      expect(request2).toHaveProperty(
        'body.query.constant_score.filter.bool.must.0.term.parent_id',
        'something'
      );
      expect(request3).toHaveProperty('index', 'somewhere');
      expect(request3).toHaveProperty(
        'body.query.constant_score.filter.bool.must.0.term.parent_id',
        'something'
      );
    });

    it('should stop reading on empty chunk', async () => {
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source', {
          jobtype: 'pdf',
          output: {
            content: '12',
            size: 6,
          },
        })
      );
      client.search.mockResponseOnce(set<any>({}, 'hits.hits.0._source.output.content', '34'));
      client.search.mockResponseOnce(set<any>({}, 'hits.hits.0._source.output.content', ''));
      let data = '';
      for await (const chunk of stream) {
        data += chunk;
      }

      expect(data).toEqual('1234');
      expect(client.search).toHaveBeenCalledTimes(3);
    });

    it('should read until chunks are present when there is no size', async () => {
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source', {
          jobtype: 'pdf',
          output: {
            content: '12',
          },
        })
      );
      client.search.mockResponseOnce(set<any>({}, 'hits.hits.0._source.output.content', '34'));
      client.search.mockResponseOnce({} as any);
      let data = '';
      for await (const chunk of stream) {
        data += chunk;
      }

      expect(data).toEqual('1234');
      expect(client.search).toHaveBeenCalledTimes(3);
    });

    it('should decode every chunk separately', async () => {
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source', {
          jobtype: 'pdf',
          output: {
            content: Buffer.from('12').toString('base64'),
            size: 6,
          },
        })
      );
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source.output.content', Buffer.from('34').toString('base64'))
      );
      client.search.mockResponseOnce(
        set<any>({}, 'hits.hits.0._source.output.content', Buffer.from('56').toString('base64'))
      );
      let data = '';
      for await (const chunk of base64Stream) {
        data += chunk;
      }

      expect(data).toEqual('123456');
    });
  });

  describe('write', () => {
    it('should not send a request until stream is closed', () => {
      stream.write('something');

      expect(client.update).not.toHaveBeenCalled();
    });

    it('should send the contents when stream ends', async () => {
      stream.write('123');
      stream.write('456');
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.update).toHaveBeenCalledTimes(1);

      const [[request]] = client.update.mock.calls;

      expect(request).toHaveProperty('id', 'something');
      expect(request).toHaveProperty('index', 'somewhere');
      expect(request).toHaveProperty('body.doc.output.content', '123456');
    });

    it('should update a number of written bytes', async () => {
      stream.write('123');
      stream.write('456');
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(stream.bytesWritten).toBe(6);
    });

    it('should emit an error event', async () => {
      client.update.mockRejectedValueOnce('some error');

      stream.end('data');
      const error = await new Promise((resolve) => stream.once('error', resolve));

      expect(error).toBe('some error');
    });

    it('should update _seq_no and _primary_term from the response', async () => {
      client.update.mockResponseOnce({
        _primary_term: 1,
        _seq_no: 10,
      } as any);

      stream.end('something');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(stream.getPrimaryTerm()).toBe(1);
      expect(stream.getSeqNo()).toBe(10);
    });

    it('should encode using base64', async () => {
      base64Stream.end('12345');
      await new Promise((resolve) => base64Stream.once('finish', resolve));

      expect(client.update).toHaveBeenCalledTimes(1);

      const [[request]] = client.update.mock.calls;

      expect(request).toHaveProperty(
        'body.doc.output.content',
        Buffer.from('12345').toString('base64')
      );
    });

    it('should remove all previous chunks before writing', async () => {
      stream.end('12345');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.deleteByQuery).toHaveBeenCalledTimes(1);

      const [[request]] = client.deleteByQuery.mock.calls;

      expect(request).toHaveProperty('index', 'somewhere');
      expect(request).toHaveProperty('body.query.match.parent_id', 'something');
    });

    it('should split raw data into chunks', async () => {
      client.cluster.getSettings.mockResponseOnce(
        set<any>({}, 'defaults.http.max_content_length', 1028)
      );
      stream.end('123456');
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.update).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining(set({}, 'body.doc.output.content', '12'))
      );
      expect(client.index).toHaveBeenCalledTimes(2);
      expect(client.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
          index: 'somewhere',
          body: {
            parent_id: 'something',
            output: {
              content: '34',
              chunk: 1,
            },
          },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: expect.any(String),
          index: 'somewhere',
          body: {
            parent_id: 'something',
            output: {
              content: '56',
              chunk: 2,
            },
          },
        })
      );
    });

    it('should encode every chunk separately', async () => {
      client.cluster.getSettings.mockResponseOnce(
        set<any>({}, 'defaults.http.max_content_length', 1028)
      );
      base64Stream.end('12345678');
      await new Promise((resolve) => base64Stream.once('finish', resolve));

      expect(client.update).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining(
          set({}, 'body.doc.output.content', Buffer.from('123').toString('base64'))
        )
      );
      expect(client.index).toHaveBeenCalledTimes(2);
      expect(client.index).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: expect.any(String),
          index: 'somewhere',
          body: {
            parent_id: 'something',
            output: {
              content: Buffer.from('456').toString('base64'),
              chunk: 1,
            },
          },
        })
      );
      expect(client.index).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: expect.any(String),
          index: 'somewhere',
          body: {
            parent_id: 'something',
            output: {
              content: Buffer.from('78').toString('base64'),
              chunk: 2,
            },
          },
        })
      );
    });

    it('should clear the job contents on writing empty data', async () => {
      stream.end();
      await new Promise((resolve) => stream.once('finish', resolve));

      expect(client.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledTimes(1);

      const [[deleteRequest]] = client.deleteByQuery.mock.calls;
      const [[updateRequest]] = client.update.mock.calls;

      expect(deleteRequest).toHaveProperty('body.query.match.parent_id', 'something');
      expect(updateRequest).toHaveProperty('body.doc.output.content', '');
    });
  });
});
