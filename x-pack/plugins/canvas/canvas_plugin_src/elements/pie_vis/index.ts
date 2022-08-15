/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const pieVis: ElementFactory = () => ({
  name: 'pieVis',
  displayName: '(New) Pie Vis',
  type: 'chart',
  help: 'Pie visualization',
  icon: 'visPie',
  expression: `kibana
| selectFilter
| demodata
| head 10
| pieVis metric={visdimension "age"} buckets={visdimension "project"} buckets={visdimension "cost"} legendDisplay="default"
| render`,
});
