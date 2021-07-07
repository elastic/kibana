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

export const usePlugins = () => {
  const timelinePlugins = useTimelineContext()?.editor_plugins;

  return useMemo(() => {
    const uiPlugins = getDefaultEuiMarkdownUiPlugins();
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
    const processingPlugins = getDefaultEuiMarkdownProcessingPlugins() as TemporaryProcessingPluginsType;

    if (timelinePlugins) {
      uiPlugins.push(timelinePlugins.uiPlugin);

      parsingPlugins.push(timelinePlugins.parsingPlugin);

      // This line of code is TS-compatible and it will break if [1][1] change in the future.
      processingPlugins[1][1].components.timeline = timelinePlugins.processingPluginRenderer;
    }

    return {
      uiPlugins,
      parsingPlugins,
      processingPlugins,
    };
  }, [timelinePlugins]);
};
