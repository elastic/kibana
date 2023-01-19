/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export interface LeftSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Width used when rendering the panel
   */
  width: number;
}

export const LeftSection: React.FC<LeftSectionProps> = ({ component, width }: LeftSectionProps) => {
  return (
    <EuiFlexItem grow>
      <EuiFlexGroup direction="column" style={{ maxWidth: width, width: 'auto' }}>
        {component}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

LeftSection.displayName = 'LeftSection';
