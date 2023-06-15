/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiBadgeGroupProps } from '@elastic/eui';
import { EuiBadgeGroup, EuiBadge } from '@elastic/eui';
import styled from 'styled-components';

interface CategoryViewerProps {
  category: string;
  color?: string;
  gutterSize?: EuiBadgeGroupProps['gutterSize'];
}

const MyEuiBadge = styled(EuiBadge)`
  max-width: 200px;
`;

const CategoryViewerComponent: React.FC<CategoryViewerProps> = ({
  category,
  color = 'default',
  gutterSize,
}) => (
  <EuiBadgeGroup gutterSize={gutterSize}>
    <MyEuiBadge data-test-subj={`category-${category}`} color={color} key={category}>
      {category}
    </MyEuiBadge>
  </EuiBadgeGroup>
);
CategoryViewerComponent.displayName = 'CategoryViewer';

export const CategoryViewer = memo(CategoryViewerComponent);
