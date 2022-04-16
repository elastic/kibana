/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import {
  DeleteResponse,
  SearchHit,
  SearchResponse,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { errors } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from '@kbn/core/server';
import { ReportingCore } from '../..';
import { REPORTING_SYSTEM_INDEX } from '../../../common/constants';
import { ReportApiJSON, ReportSource } from '../../../common/types';
import { statuses } from '../../lib/statuses';
import { Report } from '../../lib/store';
import { ReportingUser } from '../../types';

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
  getError(id: string): Promise<string>;
  delete(deleteIndex: string, id: string): Promise<TransportResult<DeleteResponse>>;
}

export function jobsQueryFactory(reportingCore: ReportingCore): JobsQueryFactory {
  function getIndex() {
    return `${REPORTING_SYSTEM_INDEX}-*`;
  }

  async function execQuery<
    T extends (client: ElasticsearchClient) => Promise<Awaited<ReturnType<T>> | undefined>
  >(callback: T): Promise<Awaited<ReturnType<T>> | undefined> {
    try {
      const { asInternalUser: client } = await reportingCore.getEsClient();

      return await callback(client);
    } catch (error) {
      if (error instanceof errors.ResponseError && [401, 403, 404].includes(error.statusCode!)) {
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
      )) as SearchResponse<ReportSource>;

      return (
        response?.hits?.hits.map((report: SearchHit<ReportSource>) => {
          const { _source: reportSource, ...reportHead } = report;
          if (!reportSource) {
            throw new Error(`Search hit did not include _source!`);
          }

          const reportInstance = new Report({ ...reportSource, ...reportHead });
          return reportInstance.toApiJSON();
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

      return response?.count ?? 0;
    },

    async get(user, id) {
      const { logger } = reportingCore.getPluginSetupDeps();
      if (!id) {
        logger.warn(`No ID provided for GET`);
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
        elasticsearchClient.search<ReportSource>({ body, index: getIndex() })
      );

      const result = response?.hits?.hits?.[0];
      if (!result?._source) {
        logger.warn(`No hits resulted in search`);
        return;
      }

      const report = new Report({ ...result, ...result._source });
      return report.toApiJSON();
    },

    async getError(id) {
      const body: SearchRequest['body'] = {
        _source: {
          includes: ['output.content', 'status'],
        },
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }],
              },
            },
          },
        },
        size: 1,
      };

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search<ReportSource>({ body, index: getIndex() })
      );
      const hits = response?.hits?.hits?.[0];
      const status = hits?._source?.status;

      if (status !== statuses.JOB_STATUS_FAILED) {
        throw new Error(`Can not get error for ${id}`);
      }

      return hits?._source?.output?.content!;
    },

    async delete(deleteIndex, id) {
      try {
        const { asInternalUser: elasticsearchClient } = await reportingCore.getEsClient();
        const query = { id, index: deleteIndex, refresh: true };

        return await elasticsearchClient.delete(query, { meta: true });
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
