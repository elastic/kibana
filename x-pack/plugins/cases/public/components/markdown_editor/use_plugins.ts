/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
import { useMemo } from 'react';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { TemporaryProcessingPluginsType } from './types';
import { KibanaServices, useKibanaCapabilities } from '../../common/lib/kibana';
import * as lensMarkdownPlugin from './plugins/lens';
import { ID as LensPluginId } from './plugins/lens/constants';

export const usePlugins = (disabledPlugins?: string[]) => {
  const kibanaConfig = KibanaServices.getConfig();
  const timelinePlugins = useTimelineContext()?.editor_plugins;
  const appCapabilities = useKibanaCapabilities();

  return useMemo(() => {
    const uiPlugins = getDefaultEuiMarkdownUiPlugins();
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
    const processingPlugins =
      getDefaultEuiMarkdownProcessingPlugins() as TemporaryProcessingPluginsType;

    if (timelinePlugins) {
      uiPlugins.push(timelinePlugins.uiPlugin);

      parsingPlugins.push(timelinePlugins.parsingPlugin);

      // This line of code is TS-compatible and it will break if [1][1] change in the future.
      processingPlugins[1][1].components.timeline = timelinePlugins.processingPluginRenderer;
    }

    if (
      kibanaConfig?.markdownPlugins?.lens &&
      !disabledPlugins?.includes(LensPluginId) &&
      appCapabilities?.visualize &&
      // TODO remove this check after the lens plugin fixes this bug
      appCapabilities.dashboard
    ) {
      uiPlugins.push(lensMarkdownPlugin.plugin);
    }

    parsingPlugins.push(lensMarkdownPlugin.parser);
    // This line of code is TS-compatible and it will break if [1][1] change in the future.
    processingPlugins[1][1].components.lens = lensMarkdownPlugin.renderer;

    return {
      uiPlugins,
      parsingPlugins,
      processingPlugins,
    };
  }, [
    appCapabilities?.dashboard,
    appCapabilities?.visualize,
    disabledPlugins,
    kibanaConfig?.markdownPlugins?.lens,
    timelinePlugins,
  ]);
};
