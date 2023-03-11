/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import type { PanelViewAndParameters } from '../types';

/**
 * Calculate the expected URL search based on options.
 */
export function urlSearch(
  resolverComponentInstanceID: string,
  options?: PanelViewAndParameters
): string {
  if (!options) {
    return '';
  }
  const params = new URLSearchParams();
  params.set(`resolver-${resolverComponentInstanceID}`, encode(options));
  return params.toString();
}
