/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMetricsFeatureField } from '../../../common/types/api';
import type { BaseHandlerCommonOptions, MetricsHandler } from './types';

export abstract class BaseHandler<R> implements MetricsHandler<R> {
  constructor(
    protected readonly options: BaseHandlerCommonOptions,
    private readonly features?: CasesMetricsFeatureField[]
  ) {}

  getFeatures(): Set<CasesMetricsFeatureField> {
    return new Set(this.features);
  }

  abstract compute(): Promise<R>;
}
