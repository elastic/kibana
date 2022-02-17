/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const heatmap: ElementFactory = () => ({
  name: 'heatmap',
  displayName: 'Heatmap',
  type: 'chart',
  help: 'Heatmap visualization',
  icon: 'heatmap',
  expression: `filters
| demodata
| head 10
| heatmap xAccessor={visdimension "age"} yAccessor={visdimension "project"} valueAccessor={visdimension "cost"}
| render`,
});
