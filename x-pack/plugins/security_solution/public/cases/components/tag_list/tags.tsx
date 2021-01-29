/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiBadgeGroup, EuiBadge, EuiBadgeGroupProps } from '@elastic/eui';

interface TagsProps {
  tags: string[];
  color?: string;
  gutterSize?: EuiBadgeGroupProps['gutterSize'];
}

const TagsComponent: React.FC<TagsProps> = ({ tags, color = 'default', gutterSize }) => {
  return (
    <>
      {tags.length > 0 && (
        <EuiBadgeGroup gutterSize={gutterSize}>
          {tags.map((tag) => (
            <EuiBadge data-test-subj={`tag-${tag}`} color={color} key={tag}>
              {tag}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      )}
    </>
  );
};

export const Tags = memo(TagsComponent);
