/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamDetailsClient } from './data_stream_details_client';
import {
  DataStreamDetailsServiceSetup,
  DataStreamDetailsServiceStartDeps,
  DataStreamDetailsServiceStart,
} from './types';

export class DataStreamDetailsService {
  constructor() {}

  public setup(): DataStreamDetailsServiceSetup {}

  public start({ http }: DataStreamDetailsServiceStartDeps): DataStreamDetailsServiceStart {
    const client = new DataStreamDetailsClient(http);

    return {
      client,
    };
  }
}
