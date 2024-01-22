/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamQualityClient } from './data_stream_quality_client';
import {
  DataStreamQualityServiceSetup,
  DataStreamQualityServiceStart,
  DataStreamQualityServiceStartDeps,
} from './types';

export class DataStreamQualityService {
  constructor() {}

  public setup(): DataStreamQualityServiceSetup {}

  public start({ http }: DataStreamQualityServiceStartDeps): DataStreamQualityServiceStart {
    const client = new DataStreamQualityClient({ http });

    return {
      client,
    };
  }
}
