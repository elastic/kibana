/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalMetadata } from './global_metadata';

export const commonOtelMetadata = [
  ...globalMetadata,
  {
    source: 'k8s.namespace.name',
    destination: 'k8s.namespace.name',
    aggregation: 'terms',
  },
  {
    source: 'k8s.cluster.name',
    destination: 'k8s.cluster.name',
    aggregation: 'top_value',
  },
];
