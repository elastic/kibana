/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent_Deprecated as EuiPageContent,
} from '@elastic/eui';
import React from 'react';
import type { FC, PropsWithChildren } from 'react';

interface LayoutProps {
  title: string | React.ReactNode;
  actionSection?: React.ReactNode;
}

export const NoDataLayout: FC<PropsWithChildren<LayoutProps>> = ({
  actionSection,
  title,
  children,
}) => {
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="logoBeats"
            title={<h2>{title}</h2>}
            body={children}
            actions={actionSection}
          />
        </EuiPageContent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
