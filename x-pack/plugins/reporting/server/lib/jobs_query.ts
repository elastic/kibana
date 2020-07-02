/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { errors as elasticsearchErrors } from 'elasticsearch';
import { get } from 'lodash';
import { ReportingCore } from '../';
import { AuthenticatedUser } from '../../../security/server';
import { JobSource } from '../types';

const esErrors = elasticsearchErrors as Record<string, any>;
const defaultSize = 10;

interface QueryBody {
  size?: number;
  from?: number;
  _source?: {
    excludes: string[];
  };
  query: {
    constant_score: {
      filter: {
        bool: {
          must: Array<Record<string, any>>;
        };
      };
    };
  };
}

interface GetOpts {
  includeContent?: boolean;
}

interface CountAggResult {
  count: number;
}

const getUsername = (user: AuthenticatedUser | null) => (user ? user.username : false);

export function jobsQueryFactory(reportingCore: ReportingCore) {
  const { elasticsearch } = reportingCore.getPluginSetupDeps();
  const { callAsInternalUser } = elasticsearch.legacy.client;

  function execQuery(queryType: string, body: QueryBody) {
    const defaultBody: Record<string, object> = {
      search: {
        _source: {
          excludes: ['output.content'],
        },
        sort: [{ created_at: { order: 'desc' } }],
        size: defaultSize,
      },
    };

    const config = reportingCore.getConfig();
    const index = config.get('index');
    const query = {
      index: `${index}-*`,
      body: Object.assign(defaultBody[queryType] || {}, body),
    };

    return callAsInternalUser(queryType, query).catch((err) => {
      if (err instanceof esErrors['401']) return;
      if (err instanceof esErrors['403']) return;
      if (err instanceof esErrors['404']) return;
      throw err;
    });
  }

  type Result = number;

  function getHits(query: Promise<Result>) {
    return query.then((res) => get(res, 'hits.hits', []));
  }

  return {
    list(
      jobTypes: string[],
      user: AuthenticatedUser | null,
      page = 0,
      size = defaultSize,
      jobIds: string[] | null
    ) {
      const username = getUsername(user);
      const body: QueryBody = {
        size,
        from: size * page,
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

      if (jobIds) {
        body.query.constant_score.filter.bool.must.push({
          ids: { values: jobIds },
        });
      }

      return getHits(execQuery('search', body));
    },

    count(jobTypes: string[], user: AuthenticatedUser | null) {
      const username = getUsername(user);
      const body: QueryBody = {
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

      return execQuery('count', body).then((doc: CountAggResult) => {
        if (!doc) return 0;
        return doc.count;
      });
    },

    get(
      user: AuthenticatedUser | null,
      id: string,
      opts: GetOpts = {}
    ): Promise<JobSource<unknown> | void> {
      if (!id) return Promise.resolve();
      const username = getUsername(user);

      const body: QueryBody = {
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

      if (opts.includeContent) {
        body._source = {
          excludes: [],
        };
      }

      return getHits(execQuery('search', body)).then((hits) => {
        if (hits.length !== 1) return;
        return hits[0];
      });
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
