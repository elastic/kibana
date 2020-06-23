/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withProps } from 'recompose';
import { tagsRegistry } from '../../lib/tags_registry';
import { TagList as Component, Props as ComponentProps } from './tag_list';
import { TagSpec } from '../../lib/tag';

interface Props {
  /**
   * list of tags to display in the list
   */
  tags: string[];
  /**
   * choose EuiHealth or EuiBadge
   */
  tagType: 'health' | 'badge';
}

export const TagList = compose<ComponentProps, Props>(
  withProps(() => ({
    getTag: (tag: string): TagSpec => tagsRegistry.get(tag) || { name: tag, color: undefined },
  }))
)(Component);
