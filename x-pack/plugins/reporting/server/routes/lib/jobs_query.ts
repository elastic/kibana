/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  CountParams,
  CountResponse,
  errors as elasticsearchErrors,
  SearchParams,
  SearchResponse,
} from 'elasticsearch';
import { get } from 'lodash';
import { ReportingCore } from '../../';
import { JobSource, ReportingUser } from '../../types';

// FIXME: typescript definition does not have the proper search API field name!
declare module 'elasticsearch' {
  interface SearchParams {
    _source_excludes?: SearchParams['_sourceExclude'];
  }
}

const esErrors = elasticsearchErrors as Record<string, any>;
const defaultSize = 10;

type QueryType = 'search' | 'count';

const getUsername = (user: ReportingUser) => (user ? user.username : false);

export function jobsQueryFactory(reportingCore: ReportingCore) {
  const { elasticsearch } = reportingCore.getPluginSetupDeps();
  const { callAsInternalUser } = elasticsearch.legacy.client;

  function execQuery<ParamType extends SearchParams | CountParams, ResponseType>(
    queryType: QueryType,
    params: ParamType
  ) {
    const { body: paramsBody, ...restParams } = params;

    const config = reportingCore.getConfig();
    const index = config.get('index');
    let query: SearchParams | CountParams;
    if (queryType === 'count') {
      query = {
        body: paramsBody,
        index: `${index}-*`,
      };
    } else {
      query = {
        body: paramsBody,
        index: `${index}-*`,
        size: defaultSize,
        sort: ['created_at'],
        ...restParams,
      };
    }

    return callAsInternalUser<ResponseType>(queryType, query).catch((err) => {
      if (err instanceof esErrors['401']) return;
      if (err instanceof esErrors['403']) return;
      if (err instanceof esErrors['404']) return;
      throw err;
    });
  }

  function getHits<ResponseType>(query: Promise<ResponseType>) {
    return query.then((res) => get(res, 'hits.hits', []));
  }

  return {
    list(
      jobTypes: string[],
      user: ReportingUser,
      page = 0,
      size = defaultSize,
      jobIds: string[] | null
    ) {
      const username = getUsername(user);
      const params: SearchParams = {
        size,
        from: size * page,
        _source_excludes: ['output.content'],
        body: {
          query: {
            constant_score: {
              filter: {
                bool: {
                  must: [{ terms: { jobtype: jobTypes } }, { term: { created_by: username } }],
                },
              },
            },
          },
        },
      };

      if (jobIds) {
        params.body.query.constant_score.filter.bool.must.push({
          ids: { values: jobIds },
        });
      }

      return getHits(execQuery<SearchParams, SearchResponse<unknown>>('search', params));
    },

    count(jobTypes: string[], user: ReportingUser) {
      const username = getUsername(user);
      const params: CountParams = {
        body: {
          query: {
            constant_score: {
              filter: {
                bool: {
                  must: [{ terms: { jobtype: jobTypes } }, { term: { created_by: username } }],
                },
              },
            },
          },
        },
      };

      return execQuery<CountParams, CountResponse>('count', params).then((doc) => {
        if (!doc) return 0;
        return doc.count;
      });
    },

    get(
      user: ReportingUser,
      id: string,
      opts: { includeContent?: boolean } = {}
    ): Promise<JobSource<unknown> | void> {
      if (!id) return Promise.resolve();
      const username = getUsername(user);

      const params: SearchParams = {
        body: {
          query: {
            constant_score: {
              filter: {
                bool: {
                  must: [{ term: { _id: id } }, { term: { created_by: username } }],
                },
              },
            },
          },
        },
        _source_excludes: ['output.content'],
        size: 1,
      };

      if (opts.includeContent) {
        params._source_excludes = [];
      }

      return getHits(execQuery<SearchParams, SearchResponse<unknown>>('search', params)).then(
        (hits) => {
          if (hits.length !== 1) return;
          return hits[0];
        }
      );
    },

    async delete(deleteIndex: string, id: string) {
      try {
        const query = { id, index: deleteIndex };
        return callAsInternalUser('delete', query);
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
