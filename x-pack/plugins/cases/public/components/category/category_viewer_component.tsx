/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';

interface CategoryViewerProps {
  category: string;
}

const CategoryViewerComponent: React.FC<CategoryViewerProps> = ({ category }) => (
  <EuiText data-test-subj={`category-viewer-${category}`} key={category} size="s">
    {category}
  </EuiText>
);

CategoryViewerComponent.displayName = 'CategoryViewer';

export const CategoryViewer = memo(CategoryViewerComponent);
