/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ILegacyScopedClusterClient } from 'src/core/server';

export interface PipelineListItemOptions {
  id: string;
  description: string;
  last_modified: string;
  username: string;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    logstash?: {
      esClient: ILegacyScopedClusterClient;
    };
  }
}
