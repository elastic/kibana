/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { statuses } from '../../lib';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';

import { jobsQueryFactory } from './jobs_query';

describe('jobsQuery', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let jobsQuery: ReturnType<typeof jobsQueryFactory>;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    const core = await createMockReportingCore(schema);

    client = (await core.getEsClient()).asInternalUser as typeof client;
    jobsQuery = jobsQueryFactory(core);
  });

  describe('list', () => {
    beforeEach(() => {
      client.search.mockResponse(
        set<Awaited<ReturnType<ElasticsearchClient['search']>>>({}, 'hits.hits', [
          { _source: { _id: 'id1', jobtype: 'pdf', payload: {} } },
          { _source: { _id: 'id2', jobtype: 'csv', payload: {} } },
        ])
      );
    });

    it('should pass parameters in the request body', async () => {
      await jobsQuery.list(['pdf'], { username: 'somebody' }, 1, 10, ['id1', 'id2']);
      await jobsQuery.list(['pdf'], { username: 'somebody' }, 1, 10, null);

      expect(client.search).toHaveBeenCalledTimes(2);
      expect(client.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          body: expect.objectContaining({
            size: 10,
            from: 10,
            query: set(
              {},
              'constant_score.filter.bool.must',
              expect.arrayContaining([
                { terms: { jobtype: ['pdf'] } },
                { term: { created_by: 'somebody' } },
                { ids: { values: ['id1', 'id2'] } },
              ])
            ),
          }),
        })
      );

      expect(client.search).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          body: expect.objectContaining({
            query: set(
              {},
              'constant_score.filter.bool.must',
              expect.not.arrayContaining([{ ids: expect.any(Object) }])
            ),
          }),
        })
      );
    });

    it('should return reports list', async () => {
      await expect(jobsQuery.list(['pdf'], { username: 'somebody' }, 0, 10, [])).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'id1', jobtype: 'pdf' }),
          expect.objectContaining({ id: 'id2', jobtype: 'csv' }),
        ])
      );
    });

    it('should return an empty array when there are no hits', async () => {
      client.search.mockResponse({} as Awaited<ReturnType<ElasticsearchClient['search']>>);

      await expect(
        jobsQuery.list(['pdf'], { username: 'somebody' }, 0, 10, [])
      ).resolves.toHaveLength(0);
    });

    it('should reject if the report source is missing', async () => {
      client.search.mockResponse(
        set<Awaited<ReturnType<ElasticsearchClient['search']>>>({}, 'hits.hits', [{}])
      );

      await expect(
        jobsQuery.list(['pdf'], { username: 'somebody' }, 0, 10, [])
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe('count', () => {
    beforeEach(() => {
      client.count.mockResponse({ count: 10 } as Awaited<ReturnType<ElasticsearchClient['count']>>);
    });

    it('should pass parameters in the request body', async () => {
      await jobsQuery.count(['pdf'], { username: 'somebody' });

      expect(client.count).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: set(
              {},
              'constant_score.filter.bool.must',
              expect.arrayContaining([
                { terms: { jobtype: ['pdf'] } },
                { term: { created_by: 'somebody' } },
              ])
            ),
          }),
        })
      );
    });

    it('should return reports number', async () => {
      await expect(jobsQuery.count(['pdf'], { username: 'somebody' })).resolves.toBe(10);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      client.search.mockResponse(
        set<Awaited<ReturnType<ElasticsearchClient['search']>>>({}, 'hits.hits', [
          { _source: { _id: 'id1', jobtype: 'pdf', payload: {} } },
        ])
      );
    });

    it('should pass parameters in the request body', async () => {
      await jobsQuery.get({ username: 'somebody' }, 'id1');

      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: set(
              {},
              'constant_score.filter.bool.must',
              expect.arrayContaining([
                { term: { _id: 'id1' } },
                { term: { created_by: 'somebody' } },
              ])
            ),
          }),
        })
      );
    });

    it('should return the report', async () => {
      await expect(jobsQuery.get({ username: 'somebody' }, 'id1')).resolves.toEqual(
        expect.objectContaining({ id: 'id1', jobtype: 'pdf' })
      );
    });

    it('should return undefined when there is no report', async () => {
      client.search.mockResponse({} as Awaited<ReturnType<ElasticsearchClient['search']>>);

      await expect(jobsQuery.get({ username: 'somebody' }, 'id1')).resolves.toBeUndefined();
    });

    it('should return undefined when id is empty', async () => {
      await expect(jobsQuery.get({ username: 'somebody' }, '')).resolves.toBeUndefined();
      expect(client.search).not.toHaveBeenCalled();
    });
  });

  describe('getError', () => {
    beforeEach(() => {
      client.search.mockResponse(
        set<Awaited<ReturnType<ElasticsearchClient['search']>>>({}, 'hits.hits', [
          {
            _source: {
              _id: 'id1',
              jobtype: 'pdf',
              output: { content: 'Some error' },
              status: statuses.JOB_STATUS_FAILED,
            },
          },
        ])
      );
    });

    it('should pass parameters in the request body', async () => {
      await jobsQuery.getError('id1');

      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: set(
              {},
              'constant_score.filter.bool.must',
              expect.arrayContaining([{ term: { _id: 'id1' } }])
            ),
          }),
        })
      );
    });

    it('should return the error', async () => {
      await expect(jobsQuery.getError('id1')).resolves.toBe('Some error');
    });

    it('should reject when the job is not failed', async () => {
      client.search.mockResponse(
        set<Awaited<ReturnType<ElasticsearchClient['search']>>>({}, 'hits.hits', [
          {
            _source: {
              _id: 'id1',
              jobtype: 'pdf',
              status: statuses.JOB_STATUS_PENDING,
            },
          },
        ])
      );

      await expect(jobsQuery.getError('id1')).rejects.toBeInstanceOf(Error);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      client.delete.mockResponse({} as Awaited<ReturnType<ElasticsearchClient['delete']>>);
    });

    it('should pass parameters in the request body', async () => {
      await jobsQuery.delete('.reporting-12345', 'id1');

      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'id1',
          index: '.reporting-12345',
        }),
        { meta: true }
      );
    });
  });
});
