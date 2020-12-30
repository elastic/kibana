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
import {
  HostMetadata,
  HostMetadataDetails,
  MetadataQueryStrategyVersions,
} from '../../common/endpoint/types';

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
  queryStrategyVersion: MetadataQueryStrategyVersions;
}

export interface HostQueryResult {
  resultLength: number;
  result: HostMetadata | undefined;
  queryStrategyVersion: MetadataQueryStrategyVersions;
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
