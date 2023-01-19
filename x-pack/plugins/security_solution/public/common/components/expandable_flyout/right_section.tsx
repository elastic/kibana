/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export interface RightSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Width used when rendering the panel
   */
  width: number;
}

export const RightSection: React.FC<RightSectionProps> = ({
  component,
  width,
}: RightSectionProps) => {
  return (
    <EuiFlexItem grow={false} style={{ height: '100%' }}>
      <EuiFlexGroup direction="column" style={{ width }}>
        {component}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

RightSection.displayName = 'RightSection';
