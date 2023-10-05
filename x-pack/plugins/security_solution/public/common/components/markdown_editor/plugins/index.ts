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

export const nonStatefulUiPlugins = getDefaultEuiMarkdownUiPlugins();
export const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
export const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

export const platinumOnlyPluginTokens = [insightMarkdownPlugin.insightPrefix];

export const uiPlugins = ({
  insightsUpsellingMessage,
}: {
  insightsUpsellingMessage: string | null;
}) => {
  const currentPlugins = nonStatefulUiPlugins.map((plugin) => plugin.name);
  const insightPluginWithLicense = insightMarkdownPlugin.plugin({
    insightsUpsellingMessage,
  });
  if (currentPlugins.includes(insightPluginWithLicense.name) === false) {
    nonStatefulUiPlugins.push(timelineMarkdownPlugin.plugin);
    nonStatefulUiPlugins.push(osqueryMarkdownPlugin.plugin);
    nonStatefulUiPlugins.push(insightPluginWithLicense);
  } else {
    // When called for the second time we need to update insightMarkdownPlugin
    const index = nonStatefulUiPlugins.findIndex(
      (plugin) => plugin.name === insightPluginWithLicense.name
    );
    nonStatefulUiPlugins[index] = insightPluginWithLicense;
  }

  return nonStatefulUiPlugins;
};

parsingPlugins.push(insightMarkdownPlugin.parser);
parsingPlugins.push(timelineMarkdownPlugin.parser);
parsingPlugins.push(osqueryMarkdownPlugin.parser);

// This line of code is TS-compatible and it will break if [1][1] change in the future.
processingPlugins[1][1].components.insight = insightMarkdownPlugin.renderer;
processingPlugins[1][1].components.timeline = timelineMarkdownPlugin.renderer;
processingPlugins[1][1].components.osquery = osqueryMarkdownPlugin.renderer;
