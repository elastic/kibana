/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionComponent } from 'react';
import { Plugin, PluggableList } from 'unified';
// Remove after this issue is resolved: https://github.com/elastic/eui/issues/4688
// eslint-disable-next-line import/no-extraneous-dependencies
import { Options as Remark2RehypeOptions } from 'mdast-util-to-hast';
// eslint-disable-next-line import/no-extraneous-dependencies
import rehype2react from 'rehype-react';
import { EuiLinkAnchorProps } from '@elastic/eui';
export interface CursorPosition {
  start: number;
  end: number;
}

export type TemporaryProcessingPluginsType = [
  [Plugin, Remark2RehypeOptions],
  [
    typeof rehype2react,
    Parameters<typeof rehype2react>[0] & {
      components: { a: FunctionComponent<EuiLinkAnchorProps>; timeline: unknown };
    }
  ],
  ...PluggableList
];
