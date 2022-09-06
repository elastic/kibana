/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with near duplicate service in
// `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/services/timefilter_refresh_service.ts`

import { Subject } from 'rxjs';

export interface Refresh {
  lastRefresh: number;
  timeRange?: { start: string; end: string };
}

export const aiopsRefresh$ = new Subject<Refresh>();
