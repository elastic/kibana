/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

interface SidebarTitleProps {
  title: string;
}

const SidebarTitleComponent: React.FC<SidebarTitleProps> = ({ title }) => {
  return (
    <EuiText>
      <h4>{title}</h4>
    </EuiText>
  );
};

SidebarTitleComponent.displayName = 'SidebarTitle';

export const SidebarTitle = React.memo(SidebarTitleComponent);
