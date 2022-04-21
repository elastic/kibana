/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const enum ProgressiveLoadingQuality {
  low = 'low',
  medium = 'medium',
  high = 'high',
  off = 'off',
}

export function getProbabilityFromProgressiveLoadingQuality(
  quality: ProgressiveLoadingQuality
): number {
  switch (quality) {
    case ProgressiveLoadingQuality.high:
      return 0.1;

    case ProgressiveLoadingQuality.medium:
      return 0.01;

    case ProgressiveLoadingQuality.low:
      return 0.001;

    case ProgressiveLoadingQuality.off:
      return 1;
  }
}
