/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';

interface LayoutProps {
  title: string;
  actionSection?: React.ReactNode;
  modalClosePath?: string;
}

export const NoDataLayout: React.SFC<LayoutProps> = withRouter<any>(
  ({ actionSection, title, modalClosePath, children, history }) => {
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
