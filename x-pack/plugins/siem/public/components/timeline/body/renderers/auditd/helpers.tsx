/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

export const Details = styled.div`
  margin: 10px 0px 10px 10px;
`;

export const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const Row = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    background-color: ${props => props.theme.eui.euiTableHoverColor};
  }
`;
