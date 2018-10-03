/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';

interface LayoutProps {
  title: string;
  actionSection?: React.ReactNode;
  modalRender?: () => React.ReactNode;
  modalClosePath?: string;
}

export const NoDataLayout: React.SFC<LayoutProps> = withRouter<any>(
  ({ actionSection, title, modalRender, modalClosePath, children, history }) => {
    const modalContent = modalRender && modalRender();
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiFlexGroup justifyContent="spaceAround" style={{ marginTop: 50 }}>
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
