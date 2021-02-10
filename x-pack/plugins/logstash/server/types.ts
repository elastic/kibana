/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
