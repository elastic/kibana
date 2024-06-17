/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationInterval } from '../../types';

export const encodeIntervals = (
  intervalByConnectorId: Record<string, [GenerationInterval]>
): string | null => {
  try {
    return JSON.stringify(intervalByConnectorId, null, 2);
  } catch {
    return null;
  }
};

export const decodeIntervals = (
  intervalByConnectorId: string
): Record<string, [GenerationInterval]> | null => {
  try {
    return JSON.parse(intervalByConnectorId);
  } catch {
    return null;
  }
};
