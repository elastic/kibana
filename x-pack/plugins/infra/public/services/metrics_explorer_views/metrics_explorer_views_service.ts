/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsExplorerViewsClient } from './metrics_explorer_views_client';
import {
  MetricsExplorerViewsServiceStartDeps,
  MetricsExplorerViewsServiceSetup,
  MetricsExplorerViewsServiceStart,
} from './types';

export class MetricsExplorerViewsService {
  public setup(): MetricsExplorerViewsServiceSetup {}

  public start({ http }: MetricsExplorerViewsServiceStartDeps): MetricsExplorerViewsServiceStart {
    const client = new MetricsExplorerViewsClient(http);

    return {
      client,
    };
  }
}
