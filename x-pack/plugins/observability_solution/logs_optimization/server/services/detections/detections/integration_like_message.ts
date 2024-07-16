/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MESSAGE_FIELD } from '../../../../common/constants';
import { createIntegrationLikeDetection } from '../../../../common/detections/utils';
import { IntegrationLikeDetection } from '../../../../common/detections/types';
import { LogSource } from '../types';

export class IntegrationLikeMessageDetection {
  process(logSource: LogSource): IntegrationLikeDetection | null {
    if (!(MESSAGE_FIELD in logSource)) {
      return null;
    }

    return createIntegrationLikeDetection({
      message: logSource?.message ?? '',
      detectedIntegration: '',
    });
  }
}
