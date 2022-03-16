/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadgeGroup, EuiBadge, EuiBadgeGroupProps } from '@elastic/eui';
import styled from 'styled-components';

interface TagsProps {
  tags: string[];
  color?: string;
  gutterSize?: EuiBadgeGroupProps['gutterSize'];
}
const MyEuiBadge = styled(EuiBadge)`
  max-width: 200px;
`;
const TagsComponent: React.FC<TagsProps> = ({ tags, color = 'default', gutterSize }) => (
  <>
    {tags.length > 0 && (
      <EuiBadgeGroup gutterSize={gutterSize}>
        {tags.map((tag) => (
          <MyEuiBadge data-test-subj={`tag-${tag}`} color={color} key={tag}>
            {tag}
          </MyEuiBadge>
        ))}
      </EuiBadgeGroup>
    )}
  </>
);
TagsComponent.displayName = 'Tags';

export const Tags = memo(TagsComponent);
