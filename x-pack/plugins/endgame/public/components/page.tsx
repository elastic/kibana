/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, ReactChildren } from 'react';
import {
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
} from '@elastic/eui';

export class Page extends PureComponent<{
  title?: string | ReactChildren;
  subTitle?: string | ReactChildren;
}> {
  render() {
    const { title, subTitle, children } = this.props;
    return (
      <EuiPageBody>
        {title && (
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>{title}</h1>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
        )}
        <EuiPageContent>
          {subTitle && (
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h2>{subTitle}</h2>
                </EuiTitle>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
          )}
          <EuiPageContentBody>{children}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
