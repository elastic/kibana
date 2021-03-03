/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiMarkdownEditorUiPlugin,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';

import * as timelineMarkdownPlugin from './timeline';
import * as osqueryMarkdownPlugin from './osquery';

const OSQUERY_PLUGIN_ENABLED = true;

const uiPlugins: EuiMarkdownEditorUiPlugin[] = getDefaultEuiMarkdownUiPlugins();
uiPlugins.push(timelineMarkdownPlugin.plugin);

if (OSQUERY_PLUGIN_ENABLED) {
  uiPlugins.push(osqueryMarkdownPlugin.plugin);
}

export { uiPlugins };
export const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
export const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

parsingPlugins.push(timelineMarkdownPlugin.parser);

if (OSQUERY_PLUGIN_ENABLED) {
  parsingPlugins.push(osqueryMarkdownPlugin.parser);
}

// This line of code is TS-compatible and it will break if [1][1] change in the future.
processingPlugins[1][1].components.timeline = timelineMarkdownPlugin.renderer;

if (OSQUERY_PLUGIN_ENABLED) {
  processingPlugins[1][1].components.osquery = osqueryMarkdownPlugin.renderer;
}
