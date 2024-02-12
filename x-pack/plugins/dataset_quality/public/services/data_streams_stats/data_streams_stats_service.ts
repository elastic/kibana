/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamsStatsClient } from './data_streams_stats_client';
import {
  DataStreamsStatsServiceSetup,
  DataStreamsStatsServiceStartDeps,
  DataStreamsStatsServiceStart,
} from './types';

export class DataStreamsStatsService {
  constructor() {}

  public setup(): DataStreamsStatsServiceSetup {}

  public start({ http }: DataStreamsStatsServiceStartDeps): DataStreamsStatsServiceStart {
    const client = new DataStreamsStatsClient(http);

    return {
      client,
    };
  }
}
