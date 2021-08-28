/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadgeGroup } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type {
  Tag,
  TagAttributes,
} from '../../../../../../src/plugins/saved_objects_tagging_oss/common/types';
import { TagBadge } from './tag_badge';

export interface TagListProps {
  tags: Array<Tag | TagAttributes>;
}

/**
 * Displays a list of tag
 */
export const TagList: FC<TagListProps> = ({ tags }) => {
  return (
    <EuiBadgeGroup>
      {tags.map((tag) => (
        <TagBadge key={tag.name} tag={tag} />
      ))}
    </EuiBadgeGroup>
  );
};
