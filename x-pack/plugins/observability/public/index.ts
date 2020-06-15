/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginInitializer } from 'kibana/public';
import { Plugin, ObservabilityPluginSetup, ObservabilityPluginStart } from './plugin';

export const plugin: PluginInitializer<ObservabilityPluginSetup, ObservabilityPluginStart> = (
  context: PluginInitializerContext
) => {
  return new Plugin(context);
};

export { ObservabilityPluginSetup, ObservabilityPluginStart };

export * from './components/action_menu';

export {
  useTrackPageview,
  useUiTracker,
  UiTracker,
  TrackMetricOptions,
  METRIC_TYPE,
} from './hooks/use_track_metric';

export * from './typings';
