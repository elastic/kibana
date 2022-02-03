/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const waffleVis: ElementFactory = () => ({
  name: 'waffleVis',
  displayName: '(New) Waffle Vis',
  type: 'chart',
  help: 'Waffle visualization',
  icon: 'grid',
  expression: `kibana
| selectFilter
| demodata
| head 10
| waffleVis metric={visdimension "age"} bucket={visdimension "project"} legendDisplay="default"
| render`,
});
