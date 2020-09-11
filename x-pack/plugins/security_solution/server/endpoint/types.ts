/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LoggerFactory } from 'kibana/server';
import { ConfigType } from '../config';
import { EndpointAppContextService } from './endpoint_app_context_services';
import { JsonObject } from '../../../infra/common/typed_json';
import { metadataIndexPattern } from '../../common/endpoint/constants';

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

export interface MetadataQueryConfig {
  index: string;
  elasticAgentIdProperty: string;
  hostIdProperty: string;
  sortProperty: JsonObject[];
  extraBodyProperties?: JsonObject;
}

export function metadataQueryConfigV1(): MetadataQueryConfig {
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
  };
}
