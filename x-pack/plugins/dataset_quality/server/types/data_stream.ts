/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSize } from '@elastic/elasticsearch/lib/api/types';
import { Integration } from './integration';
export interface DataStreamStat {
  name: string;
  size?: ByteSize;
  size_bytes?: number;
  last_activity?: number;
  integration?: Integration;
}

export type DataStreamTypes = 'logs' | 'metrics' | 'traces' | 'synthetics' | 'profiling';
