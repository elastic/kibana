/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ElementFactory } from '../../../types';
import { ChartMosaicIcon } from '../../../public/components/icons';

export const mosaicVis: ElementFactory = () => ({
  name: 'mosaicVis',
  displayName: '(New) Mosaic Vis',
  type: 'chart',
  help: 'Mosaic visualization',
  icon: <ChartMosaicIcon />,
  expression: `kibana
| selectFilter
| demodata
| head 10
| mosaicVis metric={visdimension "age"} buckets={visdimension "project"} buckets={visdimension "cost"} legendDisplay="default"
| render`,
});
