/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimestampUs } from '@kbn/apm-types';

interface DocumentWithTimestampUs {
  timestamp: TimestampUs;
}

/**
 * Safely extracts `timestamp.us` from an APM document,
 * returning 0 when the field is missing.
 */
export const getTimestampUs = (document?: DocumentWithTimestampUs): number => {
  return document?.timestamp?.us ?? 0;
};
