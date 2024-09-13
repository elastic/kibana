/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './aliases';

export * from './indices';

export * from './mappings';

export * from './templates';

export type {
  EnhancedDataStreamFromEs,
  Health,
  DataStream,
  DataStreamIndex,
  DataRetention,
} from './data_streams';

export * from './component_templates';

export * from './enrich_policies';
