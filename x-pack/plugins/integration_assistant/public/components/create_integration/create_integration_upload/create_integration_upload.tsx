/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import type { SetPage } from '../../types';

const useContentCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    width: 100%;
    max-width: 80em;
    padding: ${euiTheme.size.l};
  `;
};

interface CreateIntegrationUploadProps {
  setPage: SetPage;
}

export const CreateIntegrationUpload = React.memo<CreateIntegrationUploadProps>(({ setPage }) => {
  const contendCss = useContentCss();
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem css={contendCss}>{'Header'}</EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section grow>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem css={contendCss}>{'Section'}</EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.BottomBar>{'BottomBar'}</KibanaPageTemplate.BottomBar>
    </KibanaPageTemplate>
  );
});
CreateIntegrationUpload.displayName = 'CreateIntegrationUpload';
