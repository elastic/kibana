/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalMetadata } from './global_metadata';

export const commonEcsMetadata = [
  ...globalMetadata,
  {
    source: 'orchestrator.namespace',
    destination: 'orchestrator.namespace',
    aggregation: 'terms',
  },
  {
    source: 'orchestrator.cluster_ip',
    destination: 'orchestrator.cluster_id',
    aggregation: 'top_value',
  },
  {
    source: 'orchestrator.cluster_name',
    destination: 'orchestrator.cluster_name',
    aggregation: 'top_value',
  },
];
