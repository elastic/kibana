/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Detection } from '../../../common/detections/types';
import { IntegrationLikeMessageDetection } from './detections/integration_like_message';
import { MisspeltLogLevelDetection } from './detections/misspelt_log_level';
import { MisspeltMessageDetection } from './detections/misspelt_message';
import { MisspeltTimestampDetection } from './detections/misspelt_timestamp';
import { IDetectionsClient, LogDocument } from './types';

interface DetectionsClientDeps {
  logger: Logger;
}

export class DetectionsClient implements IDetectionsClient {
  private constructor(private readonly logger: Logger) {}

  detectFrom(logDocument: LogDocument): Detection[] {
    const detectionRules = [
      new MisspeltTimestampDetection(),
      new MisspeltLogLevelDetection(),
      new MisspeltMessageDetection(),
      new IntegrationLikeMessageDetection(),
    ];

    const detections = detectionRules
      .map((detection) => detection.process(logDocument._source ?? {}))
      .filter(Boolean) as Detection[];

    this.logger.debug(
      `Detected ${detections.length} possible changes document with id "${logDocument._id}"`
    );

    return detections;
  }

  public static create({ logger }: DetectionsClientDeps) {
    return new DetectionsClient(logger);
  }
}
