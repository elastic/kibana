/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogViewsStaticConfig } from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';
import { LogViewsServiceStartDeps, LogViewsServiceSetup, LogViewsServiceStart } from './types';

export class LogViewsService {
  constructor(private readonly config: LogViewsStaticConfig) {}

  public setup(): LogViewsServiceSetup {}

  public start({ dataViews, http, search }: LogViewsServiceStartDeps): LogViewsServiceStart {
    const client = new LogViewsClient(dataViews, http, search.search, this.config);

    return {
      client,
    };
  }
}
