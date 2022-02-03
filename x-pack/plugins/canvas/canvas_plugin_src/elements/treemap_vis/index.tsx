/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ElementFactory } from '../../../types';
import { ChartTreemapIcon } from '../../../public/components/icons';

export const treemapVis: ElementFactory = () => ({
  name: 'treemapVis',
  displayName: '(New) Treemap Vis',
  type: 'chart',
  help: 'Treemap visualization',
  icon: <ChartTreemapIcon />,
  expression: `kibana
| selectFilter
| demodata
| head 10
| treemapVis metric={visdimension "age"} buckets={visdimension "project"} buckets={visdimension "cost"} legendDisplay="default"
| render`,
});
