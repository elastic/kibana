/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME = 'threatIntelligenceSearchStrategy';

export const BARCHART_AGGREGATION_NAME = 'barchartAggregation';

/**
 * Used inside custom search strategy
 */
export enum FactoryQueryType {
  IndicatorGrid = 'indicatorGrid',
  Barchart = 'barchart',
}
