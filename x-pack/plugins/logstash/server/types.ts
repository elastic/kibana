/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { ILegacyScopedClusterClient, IRouter, RequestHandlerContext } from 'src/core/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';

export interface PipelineListItemOptions {
  id: string;
  description: string;
  last_modified: string;
  username: string;
}

/**
 * @internal
 */
export interface LogstashRequestHandlerContext extends RequestHandlerContext {
  logstash: {
    esClient: ILegacyScopedClusterClient;
  };
  licensing: LicensingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type LogstashPluginRouter = IRouter<LogstashRequestHandlerContext>;
