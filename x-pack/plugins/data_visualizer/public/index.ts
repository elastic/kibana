/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataVisualizerPlugin } from './plugin';

export function plugin() {
  return new DataVisualizerPlugin();
}

export type { DataVisualizerPluginStart } from './plugin';

export type {
  FileDataVisualizerSpec,
  IndexDataVisualizerSpec,
  IndexDataVisualizerViewProps,
} from './application';
export type { ResultLink } from './application/common/components/results_links';
