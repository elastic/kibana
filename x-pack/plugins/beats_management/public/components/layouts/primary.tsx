/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';

import {
  EuiModal,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';

interface PrimaryLayoutProps {
  title: string;
  actionSection?: React.ReactNode;
  modalRender?: () => React.ReactNode;
  modalClosePath?: string;
}

export const PrimaryLayout: React.SFC<PrimaryLayoutProps> = withRouter<any>(
  ({ actionSection, title, modalRender, modalClosePath, children, history }) => {
    const modalContent = modalRender && modalRender();
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>{title}</h1>
              </EuiTitle>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection> {actionSection}</EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageContent>
            <EuiPageContentBody>{children}</EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
        {modalContent && (
          <EuiOverlayMask>
            <EuiModal
              onClose={() => {
                history.push(modalClosePath);
              }}
              style={{ width: '640px' }}
            >
              {modalContent}
            </EuiModal>
          </EuiOverlayMask>
        )}
      </EuiPage>
    );
  }
) as any;
