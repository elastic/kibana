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
import type { TemporaryProcessingPluginsType } from './types';
import { KibanaServices, useApplicationCapabilities } from '../../common/lib/kibana';
import * as lensMarkdownPlugin from './plugins/lens';
import * as mentionsPlugin from './plugins/mentions';
import { ID as LensPluginId } from './plugins/lens/constants';
import { ID as MentionsPluginId } from './plugins/mentions/constants';

export const usePlugins = (disabledPlugins?: string[]) => {
  const kibanaConfig = KibanaServices.getConfig();
  const timelinePlugins = useTimelineContext()?.editor_plugins;
  const appCapabilities = useApplicationCapabilities();

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
      appCapabilities?.visualize.crud
    ) {
      uiPlugins.push(lensMarkdownPlugin.plugin);
    }

    parsingPlugins.push(lensMarkdownPlugin.parser);
    // This line of code is TS-compatible and it will break if [1][1] change in the future.
    processingPlugins[1][1].components.lens = lensMarkdownPlugin.renderer;

    if (kibanaConfig?.markdownPlugins?.mentions && !disabledPlugins?.includes(MentionsPluginId)) {
      uiPlugins.push(mentionsPlugin.plugin);
    }

    parsingPlugins.push(mentionsPlugin.parser);

    processingPlugins[1][1].components.mentions = mentionsPlugin.renderer;

    return {
      uiPlugins,
      parsingPlugins,
      processingPlugins,
    };
  }, [
    appCapabilities?.visualize.crud,
    disabledPlugins,
    kibanaConfig?.markdownPlugins?.lens,
    timelinePlugins,
    kibanaConfig?.markdownPlugins?.mentions,
  ]);
};
