/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { DataVisualizerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DataVisualizerPlugin(initializerContext);
}

export type { DataVisualizerPluginStart } from './plugin';

export type {
  FileDataVisualizerSpec,
  IndexDataVisualizerSpec,
  IndexDataVisualizerViewProps,
  DataDriftSpec,
} from './application';
export type {
  GetAdditionalLinksParams,
  ResultLink,
  GetAdditionalLinks,
} from './application/common/components/results_links';
