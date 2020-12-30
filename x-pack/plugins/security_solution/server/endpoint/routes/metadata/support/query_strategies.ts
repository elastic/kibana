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
import {
  HostMetadata,
  HostMetadataDetails,
  MetadataQueryStrategyVersions,
} from '../../../../../common/endpoint/types';
import { HostListQueryResult, HostQueryResult, MetadataQueryStrategy } from '../../../types';

interface HitSource {
  _source: HostMetadata;
}

export function metadataQueryStrategyV1(): MetadataQueryStrategy {
  return {
    index: metadataIndexPattern,
    elasticAgentIdProperty: 'elastic.agent.id',
    hostIdProperty: 'agent.id',
    sortProperty: [
      {
        'event.created': {
          order: 'desc',
        },
      },
    ],
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
      searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
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
    queryResponseToHostResult: (
      searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
    ): HostQueryResult => {
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
    elasticAgentIdProperty: 'HostDetails.elastic.agent.id',
    hostIdProperty: 'HostDetails.agent.id',
    sortProperty: [
      {
        'HostDetails.event.created': {
          order: 'desc',
        },
      },
    ],
    extraBodyProperties: {
      track_total_hits: true,
    },
    queryResponseToHostListResult: (
      searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
    ): HostListQueryResult => {
      const response = searchResponse as SearchResponse<HostMetadataDetails>;
      return {
        resultLength:
          ((response.hits?.total as unknown) as { value: number; relation: string }).value || 0,
        resultList:
          response.hits.hits.length > 0
            ? response.hits.hits.map((entry) => entry._source.HostDetails)
            : [],
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_2,
      };
    },
    queryResponseToHostResult: (
      searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
    ): HostQueryResult => {
      const response = searchResponse as SearchResponse<HostMetadataDetails>;
      return {
        resultLength: response.hits.hits.length,
        result:
          response.hits.hits.length > 0 ? response.hits.hits[0]._source.HostDetails : undefined,
        queryStrategyVersion: MetadataQueryStrategyVersions.VERSION_2,
      };
    },
  };
}
