/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const globalMetadata = [
  {
    source: '_index',
    destination: 'source_index',
  },
  {
    source: 'data_stream.type',
    destination: 'source_data_stream.type',
  },
  {
    source: 'data_stream.dataset',
    destination: 'source_data_stream.dataset',
  },
];
