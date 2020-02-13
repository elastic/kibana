/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';
import React from 'react';
import { withRouter } from 'react-router-dom';

interface LayoutProps {
  title: string | React.ReactNode;
  actionSection?: React.ReactNode;
  modalClosePath?: string;
}

export const NoDataLayout: React.FC<LayoutProps> = withRouter<any, React.FC<LayoutProps>>(
  ({ actionSection, title, modalClosePath, children }) => {
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
  }
) as any;
