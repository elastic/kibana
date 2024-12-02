/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { FunctionComponent } from 'react';
import { StyledComponent } from 'styled-components';
import styled from '@emotion/styled';

// The return type of this component needs to be specified because the inferred
// return type depends on types that are not exported from EUI. You get a TS4023
// error if the return type is not specified.
export const Toolbar: StyledComponent<FunctionComponent, EuiTheme> = styled(EuiPanel)`
  border-top: none;
  border-right: none;
  border-left: none;
  border-radius: 0;
  padding: ${(props) => props.theme.euiTheme.size.s} ${(props) => props.theme.size.l};
`;

Toolbar.defaultProps = { grow: false, paddingSize: 'none' };
