/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseHandler } from './base_handler';
import { AggregationBuilder, BaseHandlerCommonOptions } from './types';

export abstract class AggregationHandler extends BaseHandler {
  protected aggregationBuilders: AggregationBuilder[] = [];

  constructor(
    options: BaseHandlerCommonOptions,
    private readonly aggregations: Map<string, AggregationBuilder>
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
}
