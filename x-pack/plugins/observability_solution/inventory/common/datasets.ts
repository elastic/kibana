/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Entity } from './entities';

export type DatasetEntity = Entity<{
  'dataset.type': 'dataStream' | 'alias';
}>;

export enum DatasetType {
  dataStream = 'dataStream',
  alias = 'alias',
}

export interface DatasetDefinition {
  properties: Record<string, string | number | boolean>;
  description: string;
}
