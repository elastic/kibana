/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiLinkAnchorProps } from '@elastic/eui';
// Remove after this issue is resolved: https://github.com/elastic/eui/issues/4688
import type { Options as Remark2RehypeOptions } from 'mdast-util-to-hast';
import type { FunctionComponent } from 'react';
import type rehype2react from 'rehype-react';
import type { PluggableList, Plugin } from 'unified';
export interface CursorPosition {
  start: number;
  end: number;
}

export type TemporaryProcessingPluginsType = [
  [Plugin, Remark2RehypeOptions],
  [
    typeof rehype2react,
    Parameters<typeof rehype2react>[0] & {
      components: { a: FunctionComponent<EuiLinkAnchorProps>; lens: unknown; timeline: unknown };
    },
  ],
  ...PluggableList,
];
