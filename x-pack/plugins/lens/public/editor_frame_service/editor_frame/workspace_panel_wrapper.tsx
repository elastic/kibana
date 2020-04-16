/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiPageContentHeader, EuiPageContentBody } from '@elastic/eui';

interface Props {
  title: string;
  children: React.ReactNode | React.ReactNode[];
}

export function WorkspacePanelWrapper({ children, title }: Props) {
  return (
    <EuiPageContent className="lnsWorkspacePanelWrapper">
      {title && (
        <EuiPageContentHeader className="lnsWorkspacePanelWrapper__pageContentHeader">
          <span data-test-subj="lns_ChartTitle">{title}</span>
        </EuiPageContentHeader>
      )}
      <EuiPageContentBody className="lnsWorkspacePanelWrapper__pageContentBody">
        {children}
      </EuiPageContentBody>
    </EuiPageContent>
  );
}
