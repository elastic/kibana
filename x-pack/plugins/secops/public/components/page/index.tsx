/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage } from '@elastic/eui';
import styled from 'styled-components';

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 100%;
  padding: 1rem;
  overflow: hidden;
  margin: 0px;
`;

export const PageContent = styled.div`
  flex: 1 1 auto;
  height: 100%;
  position: relative;
  overflow-y: hidden;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

export const PageHeader = styled.div`
  flex: 0 0 auto;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

export const FooterContainer = styled.div`
  position: relative;
  left: 0;
  bottom: 0;
  width: 100%;
  color: #666;
  padding: 8px 8px;
  text-align: left;
`;
