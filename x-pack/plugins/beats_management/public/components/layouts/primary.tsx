/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

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

export class PrimaryLayout extends Component<PrimaryLayoutProps> {
  private actionSection: JSX.Element | null = null;
  constructor(props: PrimaryLayoutProps) {
    super(props);
  }

  public render() {
    const modalContent = this.props.modalRender && this.props.modalRender();
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle>
                <h1>{this.props.title}</h1>
              </EuiTitle>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection>
              {this.actionSection || <span>Nothing</span>}
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiPageContent>
            <EuiPageContentBody>
              {typeof this.props.children === 'function'
                ? this.props.children(this.renderAction)
                : this.props.children}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
        {modalContent && (
          <EuiOverlayMask>
            <EuiModal
              onClose={() => {
                // this.props.history.push(this.props.modalClosePath);
              }}
              style={{
                width: '640px',
              }}
            >
              {modalContent}
            </EuiModal>
          </EuiOverlayMask>
        )}
      </EuiPage>
    );
  }

  private renderAction = (component: JSX.Element) => {
    this.actionSection = component;
    this.forceUpdate();
  };
}
