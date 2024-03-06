/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { tagsRegistry } from '../../lib/tags_registry';
import { TagList as Component } from './tag_list';
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

export const TagList = React.memo((props: Props) => {
  const getTag = useCallback(
    (tag: string): TagSpec => tagsRegistry.get(tag) || { name: tag, color: undefined },
    []
  );
  return <Component {...props} getTag={getTag} />;
});
