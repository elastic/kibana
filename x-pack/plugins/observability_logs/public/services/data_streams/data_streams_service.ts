/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamsClient } from './data_streams_client';
import {
  DataStreamsServiceStartDeps,
  DataStreamsServiceSetup,
  DataStreamsServiceStart,
} from './types';

export class DataStreamsService {
  constructor() {}

  public setup(): DataStreamsServiceSetup {}

  public start({ http }: DataStreamsServiceStartDeps): DataStreamsServiceStart {
    const client = new DataStreamsClient(http);

    return {
      client,
    };
  }
}
