/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import {
  IndexDocumentParams,
  SearchParams,
  IndicesCreateParams,
  DeleteDocumentResponse,
  DeleteDocumentParams,
} from 'elasticsearch';
import { cloneDeep, isString, merge } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import chalk from 'chalk';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../typings/elasticsearch';
import { OBSERVER_VERSION_MAJOR } from '../../../common/elasticsearch_fieldnames';
import { pickKeys } from '../../../common/utils/pick_keys';
import { APMRequestHandlerContext } from '../../routes/typings';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

// `type` was deprecated in 7.0
export type APMIndexDocumentParams<T> = Omit<IndexDocumentParams<T>, 'type'>;

export interface IndexPrivileges {
  has_all_requested: boolean;
  index: Record<string, { read: boolean }>;
}

interface IndexPrivilegesParams {
  index: Array<{
    names: string[] | string;
    privileges: string[];
  }>;
}

export function isApmIndex(
  apmIndices: string[],
  indexParam: SearchParams['index']
) {
  if (isString(indexParam)) {
    return apmIndices.includes(indexParam);
  } else if (Array.isArray(indexParam)) {
    // return false if at least one of the indices is not an APM index
    return indexParam.every((index) => apmIndices.includes(index));
  }
  return false;
}

function addFilterForLegacyData(
  apmIndices: string[],
  params: ESSearchRequest,
  { includeLegacyData = false } = {}
): SearchParams {
  // search across all data (including data)
  if (includeLegacyData || !isApmIndex(apmIndices, params.index)) {
    return params;
  }

  const nextParams = merge(
    {
      body: {
        query: {
          bool: {
            filter: [],
          },
        },
      },
    },
    cloneDeep(params)
  );

  // add filter for omitting pre-7.x data
  nextParams.body.query.bool.filter.push({
    range: { [OBSERVER_VERSION_MAJOR]: { gte: 7 } },
  });

  return nextParams;
}

// add additional params for search (aka: read) requests
function getParamsForSearchRequest({
  context,
  params,
  indices,
  includeFrozen,
  includeLegacyData,
}: {
  context: APMRequestHandlerContext;
  params: ESSearchRequest;
  indices: ApmIndicesConfig;
  includeFrozen: boolean;
  includeLegacyData?: boolean;
}) {
  // Get indices for legacy data filter (only those which apply)
  const apmIndices = Object.values(
    pickKeys(
      indices,
      'apm_oss.sourcemapIndices',
      'apm_oss.errorIndices',
      'apm_oss.onboardingIndices',
      'apm_oss.spanIndices',
      'apm_oss.transactionIndices',
      'apm_oss.metricsIndices'
    )
  );
  return {
    ...addFilterForLegacyData(apmIndices, params, { includeLegacyData }), // filter out pre-7.0 data
    ignore_throttled: !includeFrozen, // whether to query frozen indices or not
  };
}

interface APMOptions {
  includeLegacyData: boolean;
}

interface ClientCreateOptions {
  clientAsInternalUser?: boolean;
  indices: ApmIndicesConfig;
  includeFrozen: boolean;
}

export type ESClient = ReturnType<typeof getESClient>;

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj, null, 2);
}

export function getESClient(
  context: APMRequestHandlerContext,
  request: KibanaRequest,
  { clientAsInternalUser = false, indices, includeFrozen }: ClientCreateOptions
) {
  const {
    callAsCurrentUser,
    callAsInternalUser,
  } = context.core.elasticsearch.legacy.client;

  async function callEs(operationName: string, params: Record<string, any>) {
    const startTime = process.hrtime();

    let res: any;
    let esError = null;
    try {
      res = clientAsInternalUser
        ? await callAsInternalUser(operationName, params)
        : await callAsCurrentUser(operationName, params);
    } catch (e) {
      // catch error and throw after outputting debug info
      esError = e;
    }

    if (context.params.query._debug) {
      const highlightColor = esError ? 'bgRed' : 'inverse';
      const diff = process.hrtime(startTime);
      const duration = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
      const routeInfo = `${request.route.method.toUpperCase()} ${
        request.route.path
      }`;

      console.log(
        chalk.bold[highlightColor](`=== Debug: ${routeInfo} (${duration}) ===`)
      );

      if (operationName === 'search') {
        console.log(`GET ${params.index}/_${operationName}`);
        console.log(formatObj(params.body));
      } else {
        console.log(chalk.bold('ES operation:'), operationName);

        console.log(chalk.bold('ES query:'));
        console.log(formatObj(params));
      }
      console.log(`\n`);
    }

    if (esError) {
      throw esError;
    }

    return res;
  }

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = {}
    >(
      params: TSearchRequest,
      apmOptions?: APMOptions
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      const nextParams = await getParamsForSearchRequest({
        context,
        params,
        indices,
        includeFrozen,
        ...apmOptions,
      });

      return callEs('search', nextParams);
    },
    index: <Body>(params: APMIndexDocumentParams<Body>) => {
      return callEs('index', params);
    },
    delete: (
      params: Omit<DeleteDocumentParams, 'type'>
    ): Promise<DeleteDocumentResponse> => {
      return callEs('delete', params);
    },
    indicesCreate: (params: IndicesCreateParams) => {
      return callEs('indices.create', params);
    },
    hasPrivileges: (
      params: IndexPrivilegesParams
    ): Promise<IndexPrivileges> => {
      return callEs('transport.request', {
        method: 'POST',
        path: '/_security/user/_has_privileges',
        body: params,
      });
    },
  };
}
