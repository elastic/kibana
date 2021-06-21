/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoggerFactory } from 'kibana/server';

import { SearchResponse } from '@elastic/elasticsearch/api/types';
import { JsonObject } from '@kbn/common-utils';
import { ConfigType } from '../config';
import { EndpointAppContextService } from './endpoint_app_context_services';
import { HostMetadata, MetadataQueryStrategyVersions } from '../../common/endpoint/types';
import { ExperimentalFeatures } from '../../common/experimental_features';

/**
 * The context for Endpoint apps.
 */
export interface EndpointAppContext {
  logFactory: LoggerFactory;
  config(): Promise<ConfigType>;
  experimentalFeatures: ExperimentalFeatures;

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
  extraBodyProperties?: JsonObject;
  queryResponseToHostListResult: (
    searchResponse: SearchResponse<HostMetadata>
  ) => HostListQueryResult;
  queryResponseToHostResult: (searchResponse: SearchResponse<HostMetadata>) => HostQueryResult;
}
