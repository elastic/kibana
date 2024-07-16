/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MESSAGE_FIELD } from '../../../../common/constants';
import { createMisspeltFieldDetection } from '../../../../common/detections/utils';
import { MisspeltFieldDetection } from '../../../../common/detections/types';
import { LogSource } from '../types';

// This is an hardcoded list of possible fields representing the log creation
const messageAliases = ['msg', 'description', 'event_message'];

export class MisspeltMessageDetection {
  process(logSource: LogSource): MisspeltFieldDetection | null {
    if (MESSAGE_FIELD in logSource) {
      return null;
    }

    const matchingAlias = messageAliases.find((alias) => alias in logSource);

    if (matchingAlias) {
      return createMisspeltFieldDetection({
        field: matchingAlias,
        suggestedField: MESSAGE_FIELD,
      });
    }

    return null;
  }
}
