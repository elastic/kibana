/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageContent } from '@elastic/eui';
import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

interface LayoutProps extends RouteComponentProps {
  children: React.ReactNode;
  title: string | React.ReactNode;
  actionSection?: React.ReactNode;
}

export const NoDataLayout = withRouter(({ actionSection, title, children }: LayoutProps) => (
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
));
