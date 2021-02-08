/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';

import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';

export const Toolbar = euiStyled(EuiPanel).attrs(() => ({
  grow: false,
  paddingSize: 'none',
}))`
  border-top: none;
  border-right: none;
  border-left: none;
  border-radius: 0;
  padding: ${(props) => props.theme.eui.euiSizeS} ${(props) => props.theme.eui.euiSizeL};
`;
