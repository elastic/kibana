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

import * as timelineMarkdownPlugin from './timeline';
import * as osqueryMarkdownPlugin from './osquery';
import * as insightMarkdownPlugin from './insight';

export const { uiPlugins, parsingPlugins, processingPlugins } = {
  uiPlugins: getDefaultEuiMarkdownUiPlugins(),
  parsingPlugins: getDefaultEuiMarkdownParsingPlugins(),
  processingPlugins: getDefaultEuiMarkdownProcessingPlugins(),
};

uiPlugins.push(timelineMarkdownPlugin.plugin);
uiPlugins.push(osqueryMarkdownPlugin.plugin);

parsingPlugins.push(insightMarkdownPlugin.parser);
parsingPlugins.push(timelineMarkdownPlugin.parser);
parsingPlugins.push(osqueryMarkdownPlugin.parser);

// This line of code is TS-compatible and it will break if [1][1] change in the future.
processingPlugins[1][1].components.insight = insightMarkdownPlugin.renderer;
processingPlugins[1][1].components.timeline = timelineMarkdownPlugin.renderer;
processingPlugins[1][1].components.osquery = osqueryMarkdownPlugin.renderer;
