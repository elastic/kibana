/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLinkAnchorProps,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
// Remove after this issue is resolved: https://github.com/elastic/eui/issues/4688
// eslint-disable-next-line import/no-extraneous-dependencies
import { Options as Remark2RehypeOptions } from 'mdast-util-to-hast';
import { FunctionComponent } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import rehype2react from 'rehype-react';
import { Plugin, PluggableList } from 'unified';
import * as timelineMarkdownPlugin from './timeline';

export const { uiPlugins, parsingPlugins, processingPlugins } = {
  uiPlugins: getDefaultEuiMarkdownUiPlugins(),
  parsingPlugins: getDefaultEuiMarkdownParsingPlugins(),
  processingPlugins: getDefaultEuiMarkdownProcessingPlugins() as [
    [Plugin, Remark2RehypeOptions],
    [
      typeof rehype2react,
      Parameters<typeof rehype2react>[0] & {
        components: { a: FunctionComponent<EuiLinkAnchorProps>; timeline: unknown };
      }
    ],
    ...PluggableList
  ],
};

uiPlugins.push(timelineMarkdownPlugin.plugin);

parsingPlugins.push(timelineMarkdownPlugin.parser);

// This line of code is TS-compatible and it will break if [1][1] change in the future.
processingPlugins[1][1].components.timeline = timelineMarkdownPlugin.renderer;
