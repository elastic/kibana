/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ReactNode } from 'react';

import {
  EuiHeader,
  EuiHeaderBreadcrumbs,
  EuiHeaderSection,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { BreadcrumbConsumer } from '../navigation/route_with_breadcrumb';

type RenderCallback = ((component: () => JSX.Element) => void);
interface PrimaryLayoutProps {
  title: string;
  actionSection?: React.ReactNode;
}
export class PrimaryLayout extends Component<PrimaryLayoutProps> {
  private actionSection: (() => JSX.Element) | null = null;
  constructor(props: PrimaryLayoutProps) {
    super(props);
  }

  public render() {
    const children: (callback: RenderCallback) => void | ReactNode = this.props.children as any;
    return (
      <React.Fragment>
        <BreadcrumbConsumer>
          {({ breadcrumbs }) => (
            <HeaderWrapper>
              <EuiHeaderSection>
                <EuiHeaderBreadcrumbs
                  breadcrumbs={[
                    {
                      href: '#/management',
                      text: 'Management',
                    },
                    {
                      href: '#/management/beats_management',
                      text: 'Beats',
                    },
                    ...breadcrumbs,
                  ]}
                />
              </EuiHeaderSection>
            </HeaderWrapper>
          )}
        </BreadcrumbConsumer>
        <EuiPage>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiPageHeaderSection>
                <EuiTitle>
                  <h1>{this.props.title}</h1>
                </EuiTitle>
              </EuiPageHeaderSection>
              <EuiPageHeaderSection>
                {(this.actionSection && this.actionSection()) ||
                  this.props.actionSection || <span>Nothing</span>}
              </EuiPageHeaderSection>
            </EuiPageHeader>
            <EuiPageContent>
              <EuiPageContentBody>
                {(children && typeof children === 'function'
                  ? children(this.renderAction)
                  : children) || <span />}
              </EuiPageContentBody>
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </React.Fragment>
    );
  }

  private renderAction = (component: () => JSX.Element) => {
    this.actionSection = component;
    this.forceUpdate();
  };
}

const HeaderWrapper = styled(EuiHeader)`
  height: 29px;
`;
