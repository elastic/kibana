/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { BaseHandler } from './base_handler';
import type { AggregationBuilder, AggregationResponse, BaseHandlerCommonOptions } from './types';

export abstract class AggregationHandler<R> extends BaseHandler<R> {
  protected aggregationBuilders: Array<AggregationBuilder<R>> = [];

  constructor(
    options: BaseHandlerCommonOptions,
    protected readonly aggregations: Map<string, AggregationBuilder<R>>
  ) {
    super(options);
  }

  getFeatures(): Set<string> {
    return new Set(this.aggregations.keys());
  }

  public setupFeature(feature: string) {
    const aggregation = this.aggregations.get(feature);
    if (aggregation) {
      this.aggregationBuilders.push(aggregation);
    }
  }

  public formatResponse<F>(aggregationsResponse?: AggregationResponse): F {
    return this.aggregationBuilders.reduce(
      (acc, feature) => merge(acc, feature.formatResponse(aggregationsResponse)),
      {} as F
    );
  }
}
