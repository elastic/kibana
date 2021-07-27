/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElementFactory } from '../../../types';

export const tagCloud: ElementFactory = () => ({
  name: 'tagCloud',
  displayName: 'Tag Cloud',
  type: 'chart',
  help: 'Tagcloud visualization',
  expression: `filters
  | demodata 
  | head 150
  | ply by="country" expression={math "count(country)" | as "country_count"}
  | tagcloud metric={visdimension 1 format="number"} bucket={visdimension 0}
  | render`,
});
