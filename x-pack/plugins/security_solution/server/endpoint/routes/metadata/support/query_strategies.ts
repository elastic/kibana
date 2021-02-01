/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import {
  metadataCurrentIndexPattern,
  metadataIndexPattern,
} from '../../../../../common/endpoint/constants';
import { HostMetadata, MetadataQueryStrategyVersions } from '../../../../../common/endpoint/types';
import { HostListQueryResult, HostQueryResult, MetadataQueryStrategy } from '../../../types';

interface HitSource {
  _source: HostMetadata;
}

export function metadataQueryStrategyV1(): MetadataQueryStrategy {
  return {
    index: metadataIndexPattern,
    extraBodyProperties: {
      collapse: {
        field: 'agent.id',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{ 'event.created': 'desc' }],
        },
      },
      aggs: {
        total: {
          cardinality: {
            field: 'agent.id',
          },
        },
      },
    },
    queryResponseToHostListResult: (
      searchResponse: SearchResponse<HostMetadata>
    ): HostListQueryResult => {
      const response = searchResponse as SearchResponse<HostMetadata>;
      return {
        resultLength: response?.aggregations?.total?.value || 0,
        resultList: response.hits.hits
          .map((hit) => hit.inner_hits.most_recent.hits.hits)
          .flatMap((data) => data as HitSource)
          .map((entry) => entry._source),
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_1,
      };
    },
    queryResponseToHostResult: (searchResponse: SearchResponse<HostMetadata>): HostQueryResult => {
      const response = searchResponse as SearchResponse<HostMetadata>;
      return {
        resultLength: response.hits.hits.length,
        result: response.hits.hits.length > 0 ? response.hits.hits[0]._source : undefined,
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_1,
      };
    },
  };
}

export function metadataQueryStrategyV2(): MetadataQueryStrategy {
  return {
    index: metadataCurrentIndexPattern,
    extraBodyProperties: {
      track_total_hits: true,
    },
    queryResponseToHostListResult: (
      searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
    ): HostListQueryResult => {
      const response = searchResponse as SearchResponse<
        HostMetadata | { HostDetails: HostMetadata }
      >;
      const list =
        response.hits.hits.length > 0
          ? response.hits.hits.map((entry) => stripHostDetails(entry._source))
          : [];

      return {
        resultLength:
          ((response.hits?.total as unknown) as { value: number; relation: string }).value || 0,
        resultList: list,
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_2,
      };
    },
    queryResponseToHostResult: (
      searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
    ): HostQueryResult => {
      const response = searchResponse as SearchResponse<
        HostMetadata | { HostDetails: HostMetadata }
      >;
      return {
        resultLength: response.hits.hits.length,
        result:
          response.hits.hits.length > 0
            ? stripHostDetails(response.hits.hits[0]._source)
            : undefined,
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_2,
      };
    },
  };
}

// remove the top-level 'HostDetails' property if found, from previous schemas
function stripHostDetails(host: HostMetadata | { HostDetails: HostMetadata }): HostMetadata {
  return 'HostDetails' in host ? host.HostDetails : host;
}
