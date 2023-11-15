/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';

interface HighlightContainerProps {
  children: React.ReactNode;
}

const hasNonUndefinedSubChild = (children: React.ReactNode[]): boolean => {
  return children.some((child) => {
    if (React.isValidElement(child)) {
      const subChildren = React.Children.toArray(child.props.children);
      return subChildren.some((subChild) => subChild !== undefined && subChild !== null);
    }
    return false;
  });
};

export const HighlightContainer = React.forwardRef<HTMLDivElement, HighlightContainerProps>(
  ({ children }, ref) => {
    const validChildren = React.Children.toArray(children).filter(Boolean);
    const hasChildren = validChildren.length > 0;
    const shouldRender = hasChildren && hasNonUndefinedSubChild(validChildren);

    const flexChildren = validChildren.map((child, idx) => <div key={idx}>{child}</div>);

    return shouldRender ? (
      <div ref={ref}>
        <EuiHorizontalRule margin="xs" />
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder={true}>
          {flexChildren}
        </EuiPanel>
      </div>
    ) : null;
  }
);
