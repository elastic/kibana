/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { formatDefaultAggregationResult } from './format_default_aggregation_result/latest';
export { transformAggregateResponse } from './transform_aggregate_response/latest';
export { transformAggregateBody } from './transform_aggregate_body/latest';

export { formatDefaultAggregationResult as formatDefaultAggregationResultV1 } from './format_default_aggregation_result/v1';
export { transformAggregateResponse as transformAggregateResponseV1 } from './transform_aggregate_response/v1';
export { transformAggregateBody as transformAggregateBodyV1 } from './transform_aggregate_body/v1';
