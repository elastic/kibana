/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const metricVis: ElementFactory = () => ({
  name: 'metricVis',
  displayName: '(New) Metric Vis',
  type: 'chart',
  help: 'New metric visualization',
  icon: 'visMetric',
  expression: `filters
  | demodata
  | head 5
  | metricVis metric={visdimension "percent_uptime"}
  | render`,
});
