/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ConfigType } from '../config';
import { EndpointAppContextService } from './endpoint_app_context_services';
import { JsonObject } from '../../../infra/common/typed_json';
import { metadataCurrentIndexPattern, metadataIndexPattern } from '../../common/endpoint/constants';
import { HostMetadata, HostMetadataDetails } from '../../common/endpoint/types';

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<ConfigType>;

  /**
   * Object readiness is tied to plugin start method
   */
  service: EndpointAppContextService;
}

export interface HostListQueryResult {
  resultLength: number;
  resultList: HostMetadata[];
}

interface HitSource {
  _source: HostMetadata;
}

export interface HostQueryResult {
  resultLength: number;
  result: HostMetadata | undefined;
}

export interface MetadataQueryStrategy {
  index: string;
  elasticAgentIdProperty: string;
  hostIdProperty: string;
  sortProperty: JsonObject[];
  extraBodyProperties?: JsonObject;
  queryResponseToHostListResult: (
    searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
  ) => HostListQueryResult;
  queryResponseToHostResult: (
    searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
  ) => HostQueryResult;
}

export enum MetadataQueryStrategyVersions {
  VERSION_1 = 'v1',
  VERSION_2 = 'v2',
}

export function metadataQueryStrategyV1(): MetadataQueryStrategy {
  return {
    index: metadataIndexPattern,
    elasticAgentIdProperty: 'elastic.agent.id',
    hostIdProperty: 'host.id',
    sortProperty: [
      {
        'event.created': {
          order: 'desc',
        },
      },
    ],
    extraBodyProperties: {
      collapse: {
        field: 'host.id',
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{ 'event.created': 'desc' }],
        },
      },
      aggs: {
        total: {
          cardinality: {
            field: 'host.id',
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
      };
    },
    queryResponseToHostResult: (
      searchResponse: SearchResponse<HostMetadata | HostMetadataDetails>
    ): HostQueryResult => {
      const response = searchResponse as SearchResponse<HostMetadata>;
      return {
        resultLength: response.hits.hits.length,
        result: response.hits.hits.length > 0 ? response.hits.hits[0]._source : undefined,
      };
    },
  };
}

export function metadataQueryStrategyV2(): MetadataQueryStrategy {
  return {
    index: metadataCurrentIndexPattern,
    elasticAgentIdProperty: 'HostDetails.elastic.agent.id',
    hostIdProperty: 'HostDetails.host.id',
    sortProperty: [
      {
        'HostDetails.event.created': {
          order: 'desc',
        },
      },
    ],
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
      };
    },
  };
}
