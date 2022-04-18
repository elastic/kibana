/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { annotationProvider } from './annotation';

export function annotationServiceProvider(client: IScopedClusterClient) {
  return {
    ...annotationProvider(client),
  };
}
