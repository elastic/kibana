/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from 'unist';
import { SerializableRecord } from '@kbn/utility-types';
import { TimeRange } from 'src/plugins/data/server';

export interface LensMarkdownNode extends Node {
  timeRange: TimeRange;
  attributes: SerializableRecord;
  type: string;
  id: string;
}
