/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptionsSerializable,
} from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { GetHostsRequestParams, GetHostsResponsePayload } from '../../../common/http_api/hosts';
import { parseFilterQuery } from '../../utils/serialized_query';
import { InfraSource } from '../sources';
import { getHostsMetrics, getHostsSortedMetrics } from './get_hosts_metrics';
import { getFilteredHosts } from './get_filtered_hosts';
import { mapToApiResponse } from './map_to_response';

interface ParsedFilter {
  bool: Pick<estypes.QueryDslBoolQuery, 'must' | 'filter' | 'must_not' | 'should'>;
}

const hasFilters = (params: GetHostsRequestParams) => {
  const parsedFilters = parseFilterQuery(params.query) as unknown as ParsedFilter;

  return Object.entries(parsedFilters.bool).some(([_, filter]) =>
    Array.isArray(filter) ? filter.length > 0 : !!filter
  );
};

const arrangeResult = (
  result: {
    originalOrderResponse: IKibanaSearchResponse<GetHostsResponsePayload>;
    sortedResponse?: IKibanaSearchResponse<GetHostsResponsePayload>;
  },
  params: GetHostsRequestParams
): GetHostsResponsePayload['hosts'] => {
  const { originalOrderResponse, sortedResponse } = result;

  const dedupResponse = sortedResponse
    ? originalOrderResponse.rawResponse.hosts
        .filter((o) => !sortedResponse?.rawResponse.hosts.some((s) => s.name === o.name))
        .slice(0, params.limit - sortedResponse?.rawResponse.hosts.length ?? 0)
    : originalOrderResponse.rawResponse.hosts;

  return !params.sortDirection || params.sortDirection === 'asc'
    ? [...dedupResponse, ...(sortedResponse?.rawResponse.hosts ?? [])]
    : [...(sortedResponse?.rawResponse.hosts ?? []), ...dedupResponse];
};

const fetchHostsMetrics = async (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string,
  filteredHostNames: string[] = []
): Promise<IKibanaSearchResponse<GetHostsResponsePayload>> => {
  const fetchHostsList: {
    original: () => Promise<IKibanaSearchResponse<GetHostsResponsePayload>>;
    sorted?: () => Promise<IKibanaSearchResponse<GetHostsResponsePayload>>;
  } = {
    original: () =>
      lastValueFrom(
        getHostsMetrics(serchClient, source, params, options, id, filteredHostNames)
      ).then((res) => ({
        ...res,
        rawResponse: mapToApiResponse(params, res.rawResponse),
      })),
  };

  if (params.sortField && params.sortField !== 'name') {
    fetchHostsList.sorted = () =>
      lastValueFrom(
        getHostsSortedMetrics(serchClient, source, params, options, id, filteredHostNames)
      ).then((res) => ({
        ...res,
        rawResponse: mapToApiResponse(params, res.rawResponse),
      }));
  }
  const [originalOrderResponse, sortedResponse] = await Promise.all(
    fetchHostsList.sorted
      ? [fetchHostsList.original(), fetchHostsList.sorted()]
      : [fetchHostsList.original()]
  );

  return {
    ...originalOrderResponse,
    rawResponse: { hosts: arrangeResult({ originalOrderResponse, sortedResponse }, params) },
  };
};

export const getHosts = async (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string
): Promise<IKibanaSearchResponse<GetHostsResponsePayload>> => {
  const runFilterQuery = hasFilters(params);

  const filteredHosts = runFilterQuery
    ? await lastValueFrom(getFilteredHosts(serchClient, source, params, options, id))
    : null;

  const hostsFound = (filteredHosts?.total ?? 0) > 0;
  if (runFilterQuery && !hostsFound) {
    return {
      ...filteredHosts,
      rawResponse: { hosts: [] },
    };
  }

  const filteredHostNames = filteredHosts?.rawResponse?.sampling.hosts.buckets.map((p) => p.key);

  return fetchHostsMetrics(serchClient, source, params, options, id, filteredHostNames);
};

//   serchClient: ISearchClient,
//   source: InfraSource,
//   params: GetHostsRequestParams,
//   options?: ISearchOptionsSerializable,
//   id?: string
// ): Observable<{ rawResponse: GetHostsResponsePayload | {} }> => {
//   interface PaginatedResponse extends GetHostsResponsePayload {
//     emptyHostNames: string[];
//     isCompleted: boolean;
//     afterKey?: string;
//   }
//   const init: IKibanaSearchResponse<PaginatedResponse> = {
//     rawResponse: {
//       hosts: [],
//       emptyHostNames: [],
//       isCompleted: false,
//     },
//   };

//   return of(init).pipe(
//     expand((currentPage) => {
//       if (currentPage.isRunning) {
//         return of(currentPage);
//       }

//       return getHostsPaginatedList(
//         serchClient,
//         source,
//         params,
//         options,
//         id,
//         currentPage.rawResponse.afterKey
//       ).pipe(
//         skipWhile((paginatedHostsResponse) => !!paginatedHostsResponse.rawResponse),
//         switchMap((paginatedHosts) => {
//           expand((response) => {
//             const hostNames = paginatedHosts.rawResponse?.hosts.buckets.map((p) => p.key.hostname);
//             return timer(500).pipe(switchMap(() => getBatchSearch(response.id)));
//           }),
//           takeWhile<IKibanaSearchResponse<SnapshotNodeResponse>>(isPartialResponse, true),

//           return getHostsMetrics(serchClient, source, params, options, id, hostNames).pipe(
//             concatMap((metric) => {
//               const hosts = [
//                 ...currentPage.rawResponse.hosts,
//                 ...(metric.rawResponse?.hosts ?? []),
//               ];
//               const isCompleted = hosts.length >= MAX_ITEMS || hostNames?.length === 0;
//               const emptyHostNames = hostNames?.filter((paginatedHost) =>
//                 hosts.some((p) => p.name === paginatedHost)
//               );
//               return of({
//                 ...metric,
//                 rawResponse: {
//                   hosts,
//                   isCompleted,
//                   emptyHostNames,
//                   afterKey: paginatedHosts.rawResponse?.hosts.after_key,
//                 },
//               });
//             })
//           );
//         })
//       );
//     }),
//     takeWhile((result) => {
//       console.log(result);
//       return !result.rawResponse.isCompleted;
//     }, true),
//     reduce(
//       (acc, curr) => {
//         return {
//           ...acc,
//           rawResponse: {
//             hosts: [...acc.rawResponse?.hosts, ...curr.rawResponse.hosts],
//           },
//         };
//       },
//       { rawResponse: { hosts: [] } } as IKibanaSearchResponse<GetHostsResponsePayload>
//     )
//     // getHostsPaginatedList(serchClient, source, params, options, id).pipe(
//     //   expand((response) => {
//     //     return timer(2000).pipe(
//     //       switchMap(() => {
//     //         if (!response.rawResponse) {s
//     //           return new Observable();
//     //         }

//     //         const hostNames = response.rawResponse.hosts.buckets.map((p) => p.key.hostname);
//     //         return getHostsMetrics(serchClient, source, params, options, id, hostNames);
//     //       })
//     //     );
//     //   }),
//     //   takeWhile<IKibanaSearchResponse>(isPartialResponse, true)
//   );
// };
