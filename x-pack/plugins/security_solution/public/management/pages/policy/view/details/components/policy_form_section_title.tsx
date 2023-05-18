/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactNode } from 'react';
import { EuiTitle } from '@elastic/eui';

export interface PolicyFormSectionTitleProps {
  title: string;
  children?: ReactNode;
}

export const PolicyFormSectionTitle = memo<PolicyFormSectionTitleProps>(({ title, children }) => {
  return (
    <>
      {
        <EuiTitle size="xs">
          <h5>{title}</h5>
        </EuiTitle>
      }
      {children}
    </>
  );
});
PolicyFormSectionTitle.displayName = 'PolicyFormSectionTitle';
