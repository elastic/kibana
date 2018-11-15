/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiCallOut,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Header } from '../components/header';
import { ColumnarPage, PageContent } from '../components/page';

const DetailPageContent = styled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

interface Props {
  message: string;
}

export const Error: React.SFC<Props> = ({ message }) => {
  return (
    <ColumnarPage>
      <Header />
      <DetailPageContent>
        <ErrorPageBody message={message} />
      </DetailPageContent>
    </ColumnarPage>
  );
};

export const ErrorPageBody: React.SFC<{ message: string }> = ({ message }) => {
  return (
    <EuiPage style={{ flex: '1 0 auto' }}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h1>Oops!</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiCallOut color="danger" title={message} iconType={'alert'}>
            <p>Please click the back button and try again.</p>
          </EuiCallOut>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
