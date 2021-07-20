/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { DeleteResponse, SearchHit, SearchResponse } from '@elastic/elasticsearch/api/types';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { i18n } from '@kbn/i18n';
import { UnwrapPromise } from '@kbn/utility-types';
import { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '../../';
import { ReportApiJSON, ReportDocument, ReportSource } from '../../../common/types';
import { Report } from '../../lib/store';
import { ReportingUser } from '../../types';

type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

const defaultSize = 10;
const getUsername = (user: ReportingUser) => (user ? user.username : false);

function getSearchBody(body: SearchRequest['body']): SearchRequest['body'] {
  return {
    _source: {
      excludes: ['output.content'],
    },
    sort: [{ created_at: { order: 'desc' } }],
    size: defaultSize,
    ...body,
  };
}

export type ReportContent = Pick<ReportSource, 'status' | 'jobtype' | 'output'> & {
  payload?: Pick<ReportSource['payload'], 'title'>;
};

interface JobsQueryFactory {
  list(
    jobTypes: string[],
    user: ReportingUser,
    page: number,
    size: number,
    jobIds: string[] | null
  ): Promise<ReportApiJSON[]>;
  count(jobTypes: string[], user: ReportingUser): Promise<number>;
  get(user: ReportingUser, id: string): Promise<ReportApiJSON | void>;
  getContent(user: ReportingUser, id: string): Promise<ReportContent | void>;
  delete(deleteIndex: string, id: string): Promise<ApiResponse<DeleteResponse>>;
}

export function jobsQueryFactory(reportingCore: ReportingCore): JobsQueryFactory {
  function getIndex() {
    const config = reportingCore.getConfig();

    return `${config.get('index')}-*`;
  }

  async function execQuery<T extends (client: ElasticsearchClient) => any>(
    callback: T
  ): Promise<UnwrapPromise<ReturnType<T>> | undefined> {
    try {
      const { asInternalUser: client } = await reportingCore.getEsClient();

      return await callback(client);
    } catch (error) {
      if (error instanceof ResponseError && [401, 403, 404].includes(error.statusCode)) {
        return;
      }

      throw error;
    }
  }

  return {
    async list(jobTypes, user, page = 0, size = defaultSize, jobIds) {
      const username = getUsername(user);
      const body = getSearchBody({
        size,
        from: size * page,
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [
                  { terms: { jobtype: jobTypes } },
                  { term: { created_by: username } },
                  ...(jobIds ? [{ ids: { values: jobIds } }] : []),
                ],
              },
            },
          },
        },
      });

      const response = (await execQuery((elasticsearchClient) =>
        elasticsearchClient.search({ body, index: getIndex() })
      )) as ApiResponse<SearchResponse<ReportSource>>;

      return (
        response?.body.hits?.hits.map((report: SearchHit<ReportSource>) => {
          const { _source: reportSource, ...reportHead } = report;
          if (reportSource) {
            const reportInstance = new Report({ ...reportSource, ...reportHead });
            return reportInstance.toApiJSON();
          }
          throw new Error(`Search hit did not include _source!`);
        }) ?? []
      );
    },

    async count(jobTypes, user) {
      const username = getUsername(user);
      const body = {
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ terms: { jobtype: jobTypes } }, { term: { created_by: username } }],
              },
            },
          },
        },
      };

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.count({ body, index: getIndex() })
      );

      return response?.body.count ?? 0;
    },

    async get(user, id) {
      const { logger } = reportingCore.getPluginSetupDeps();
      if (!id) {
        logger.warning(`No ID provided for GET`);
        return;
      }

      const username = getUsername(user);

      const body = getSearchBody({
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }, { term: { created_by: username } }],
              },
            },
          },
        },
        size: 1,
      });

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search({ body, index: getIndex() })
      );

      const result = response?.body.hits.hits[0] as SearchHit<ReportSource> | undefined;
      if (!result || !result._source) {
        logger.warning(`No hits resulted in search`);
        return;
      }

      const report = new Report({ ...result, ...result._source });
      return report.toApiJSON();
    },

    async getContent(user, id) {
      if (!id) {
        return;
      }

      const username = getUsername(user);
      const body: SearchRequest['body'] = {
        _source: { excludes: ['payload.headers'] },
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }, { term: { created_by: username } }],
              },
            },
          },
        },
        size: 1,
      };

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search({ body, index: getIndex() })
      );

      if (response?.body.hits?.hits?.length !== 1) {
        return;
      }

      const report = response.body.hits.hits[0] as ReportDocument;

      return {
        status: report._source.status,
        jobtype: report._source.jobtype,
        output: report._source.output,
        payload: report._source.payload,
      };
    },

    async delete(deleteIndex, id) {
      try {
        const { asInternalUser: elasticsearchClient } = await reportingCore.getEsClient();
        const query = { id, index: deleteIndex, refresh: true };

        return await elasticsearchClient.delete(query);
      } catch (error) {
        throw new Error(
          i18n.translate('xpack.reporting.jobsQuery.deleteError', {
            defaultMessage: 'Could not delete the report: {error}',
            values: { error: error.message },
          })
        );
      }
    },
  };
}
