/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_LEVEL_FIELD } from '../../../../common/constants';
import { createMisspeltFieldDetection } from '../../../../common/detections/utils';
import { MisspeltFieldDetection } from '../../../../common/detections/types';
import { LogSource } from '../types';

// This is an hardcoded list of possible fields representing the log creation
const logLevelAliases = ['log_level', 'severity', 'level'];

export class MisspeltLogLevelDetection {
  process(logSource: LogSource): MisspeltFieldDetection | null {
    if (LOG_LEVEL_FIELD in logSource) {
      return null;
    }

    const matchingAlias = logLevelAliases.find((alias) => alias in logSource);

    if (matchingAlias) {
      return createMisspeltFieldDetection({
        field: matchingAlias,
        suggestedField: LOG_LEVEL_FIELD,
      });
    }

    return null;
  }
}
