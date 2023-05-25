/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Plugin } from '@kbn/core/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DataStreamsServiceStart } from './services/data_streams';

export type ObservabilityLogsPluginSetup = void;
export interface ObservabilityLogsPluginStart {
  dataStreamsService: DataStreamsServiceStart;
}

export interface ObservabilityLogsStartDeps {
  discover: DiscoverStart;
}

export type ObservabilityLogsClientPluginClass = Plugin<
  ObservabilityLogsPluginSetup,
  ObservabilityLogsPluginStart
>;
