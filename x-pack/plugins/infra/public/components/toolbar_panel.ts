/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionComponent } from 'react';
import { EuiPanel } from '@elastic/eui';
import { StyledComponent } from 'styled-components';
import { EuiTheme, euiStyled } from '../../../../../src/plugins/kibana_react/common';

// The return type of this component needs to be specified because the inferred
// return type depends on types that are not exported from EUI. You get a TS4023
// error if the return type is not specified.
export const ToolbarPanel: StyledComponent<FunctionComponent, EuiTheme> = euiStyled(EuiPanel).attrs(
  () => ({
    grow: false,
    paddingSize: 'none',
  })
)`
  border-top: none;
  border-right: none;
  border-left: none;
  border-radius: 0;
  padding: ${(props) => `12px ${props.theme.eui.paddingSizes.m}`};
`;
