/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InternalRollup {
  dateHistogramIntervalType: 'fixed' | 'calendar';
  dateHistogramInterval: string;
  dateHistogramTimeZone?: string;
  dateHistogramField: string;
  metrics: Array<{ name: string; types: string[] }>;
  terms: Array<{ name: string }>;
  histogram: Array<{ name: string }>;
  histogramInterval?: string;
  rollupDelay?: string;
}
