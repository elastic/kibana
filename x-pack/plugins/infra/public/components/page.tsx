/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage } from '@elastic/eui';
import styled from 'styled-components';

export const ColumnarPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 0 0;
`;

export const PageContent = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: row;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;
