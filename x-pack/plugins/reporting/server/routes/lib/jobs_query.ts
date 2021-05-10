/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '../../';
import { ReportDocument } from '../../lib/store';
import { ReportingUser } from '../../types';

type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

interface GetOpts {
  includeContent?: boolean;
}

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

export function jobsQueryFactory(reportingCore: ReportingCore) {
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
    async list(
      jobTypes: string[],
      user: ReportingUser,
      page = 0,
      size = defaultSize,
      jobIds: string[] | null
    ) {
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

      const response = await execQuery((elasticsearchClient) =>
        elasticsearchClient.search({ body, index: getIndex() })
      );

      return response?.body.hits?.hits ?? [];
    },

    async count(jobTypes: string[], user: ReportingUser) {
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

    async get(user: ReportingUser, id: string, opts: GetOpts = {}): Promise<ReportDocument | void> {
      if (!id) {
        return;
      }

      const username = getUsername(user);
      const body: SearchRequest['body'] = {
        ...(opts.includeContent ? { _source: { excludes: [] } } : {}),
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

      return response.body.hits.hits[0] as ReportDocument;
    },

    async delete(deleteIndex: string, id: string) {
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
