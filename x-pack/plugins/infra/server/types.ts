/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from 'src/core/server';
import type { SearchRequestHandlerContext } from '../../../../src/plugins/data/server';
import { MlPluginSetup } from '../../ml/server';

export type MlSystem = ReturnType<MlPluginSetup['mlSystemProvider']>;
export type MlAnomalyDetectors = ReturnType<MlPluginSetup['anomalyDetectorsProvider']>;

export interface InfraMlRequestHandlerContext {
  mlAnomalyDetectors?: MlAnomalyDetectors;
  mlSystem?: MlSystem;
}

export interface InfraSpacesRequestHandlerContext {
  spaceId: string;
}

export type InfraRequestHandlerContext = InfraMlRequestHandlerContext &
  InfraSpacesRequestHandlerContext;

/**
 * @internal
 */
export interface InfraPluginRequestHandlerContext extends RequestHandlerContext {
  infra: InfraRequestHandlerContext;
  search: SearchRequestHandlerContext;
}

export interface InfraConfig {
  alerting: {
    inventory_threshold: {
      group_by_page_size: number;
    };
    metric_threshold: {
      group_by_page_size: number;
    };
  };
  inventory: {
    compositeSize: number;
  };
  sources?: {
    default?: {
      fields?: {
        message?: string[];
      };
    };
  };
}
