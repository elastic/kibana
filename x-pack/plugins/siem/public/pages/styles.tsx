/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPageHeader, EuiPageHeaderSection } from '@elastic/eui';
import styled from 'styled-components';

export const PageHeader = styled(EuiPageHeader)`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  position: fixed;
  width: calc(100% - 32px);
  z-index: 10;
  padding: 6px 0px 0px 0px;
  margin-bottom: 0px;
  margin-top: 50px;
`;

export const PageHeaderSection = styled(EuiPageHeaderSection)`
  width: 100%;
`;
