/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';

interface SidebarTitleProps {
  title: string;
}

const SidebarTitleComponent: React.FC<SidebarTitleProps> = ({ title }) => {
  return (
    <EuiTitle size="xs">
      <h2>{title}</h2>
    </EuiTitle>
  );
};

SidebarTitleComponent.displayName = 'SidebarTitle';

export const SidebarTitle = React.memo(SidebarTitleComponent);
