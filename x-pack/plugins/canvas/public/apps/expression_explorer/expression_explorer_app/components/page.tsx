/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiResizableContainer,
} from '@elastic/eui';

import { Editor } from './editor';
import { Output } from './output';
import { Preview } from './preview';

export const Page: FC = () => {
  return (
    <EuiPage style={{ minHeight: '100vh' }}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Expression Explorer</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent paddingSize="none" style={{ height: '100%' }}>
          <EuiPageContentBody style={{ height: '100%' }}>
            <EuiResizableContainer style={{ height: '100%' }}>
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel initialSize={50}>
                    <Editor />
                  </EuiResizablePanel>
                  <EuiResizableButton />
                  <EuiResizablePanel initialSize={50}>
                    <Output />
                    <Preview />
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
