/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import {
  IndexDocumentParams,
  IndicesCreateParams,
  DeleteDocumentResponse,
  DeleteDocumentParams,
} from 'elasticsearch';
import { unique, defaultsDeep } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import chalk from 'chalk';
import { PROCESSOR_EVENT } from '../../../../common/elasticsearch_fieldnames';
import { ESSearchResponse, ESFilter } from '../../../../typings/elasticsearch';
import { pickKeys } from '../../../../common/utils/pick_keys';
import { APMRequestHandlerContext } from '../../../routes/typings';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import {
  APMESSearchRequest,
  documentTypeSettings,
  APMDocumentType,
} from './document_types';
import { addFilterForLegacyData } from './add_filter_for_legacy_data';

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

// add additional params for search (aka: read) requests
function getParamsForSearchRequest<T extends APMESSearchRequest>({
  params,
  indices,
  includeFrozen,
  includeLegacyData,
}: {
  params: T;
  indices: ApmIndicesConfig;
  includeFrozen: boolean;
  includeLegacyData?: boolean;
}): ESSearchRequestOf<T> {
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

  const { apm, ...esParams } = params;

  const relevantDocumentTypeSettings = pickKeys(
    documentTypeSettings,
    ...apm.types
  );

  const nextParams: Omit<APMESSearchRequest, 'apm'> & {
    body: {
      query: {
        bool: {
          filter: ESFilter[];
        };
      };
    };
  } = defaultsDeep(esParams, {
    body: {
      query: {
        bool: {
          filter: params.body?.query?.bool?.filter ?? ([] as ESFilter[]),
        },
      },
    },
    index: unique(
      Object.values(relevantDocumentTypeSettings).map(
        (setting) => indices[setting.apmIndicesName]
      )
    ),
  });

  const processorEvents: string[] = [];

  (Object.keys(relevantDocumentTypeSettings) as APMDocumentType[]).forEach(
    (documentType) => {
      const setting = relevantDocumentTypeSettings[documentType];
      if (setting.type === 'processor_event') {
        processorEvents.push(documentType);
      }
    }
  );

  if (processorEvents.length) {
    nextParams.body.query.bool.filter.push({
      terms: {
        [PROCESSOR_EVENT]: processorEvents,
      },
    });
  }

  return {
    // filter out pre-7.0 data
    ...addFilterForLegacyData(apmIndices, nextParams, {
      includeLegacyData,
    }),
    ignore_throttled: !includeFrozen, // whether to query frozen indices or not
  } as ESSearchRequestOf<T>;
}

type ESSearchRequestOf<T extends APMESSearchRequest> = Omit<T, 'apm'> & {
  index: string[];
  ignore_throttled: boolean;
};

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
      TSearchRequest extends APMESSearchRequest = APMESSearchRequest
    >(
      params: TSearchRequest,
      apmOptions?: APMOptions
    ): Promise<
      ESSearchResponse<TDocument, ESSearchRequestOf<TSearchRequest>>
    > => {
      const nextParams = await getParamsForSearchRequest({
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
