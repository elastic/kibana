/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { DetectionsClient } from './detections_client';
import { DetectionsServiceSetup, DetectionsServiceStart } from './types';

export class DetectionsService {
  constructor(private readonly logger: Logger) {}

  public setup(): DetectionsServiceSetup {
    return {};
  }

  public start(): DetectionsServiceStart {
    const { logger } = this;

    return {
      getClient() {
        return DetectionsClient.create({ logger });
      },
    };
  }
}
