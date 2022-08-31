/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InputsModelId = 'global' | 'timeline' | 'socTrends';
// sometimes you have to bend over backwards to please typescript
export const socTrendsId: InputsModelId = 'socTrends';
export const timelineId: InputsModelId = 'timeline';

export type TimeRangeKinds = 'absolute' | 'relative';
