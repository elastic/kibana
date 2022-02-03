/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common/api';
import { BaseHandlerCommonOptions, MetricsHandler } from './types';

export abstract class BaseHandler implements MetricsHandler {
  constructor(
    protected readonly options: BaseHandlerCommonOptions,
    private readonly features?: string[]
  ) {}

  getFeatures(): Set<string> {
    return new Set(this.features);
  }

  abstract compute(): Promise<CaseMetricsResponse>;
}
