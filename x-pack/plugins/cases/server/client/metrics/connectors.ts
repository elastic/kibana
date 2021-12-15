/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common/api';
import { MetricsHandler } from './types';

export class Connectors implements MetricsHandler {
  public getFeatures(): Set<string> {
    return new Set(['connectors']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    return {
      connectors: { total: 0 },
    };
  }
}
