/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ColumnarPage = euiStyled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  width: 100%
`;

export const PageContent = euiStyled.div`
  flex: 1 0 0%;
  display: flex;
  flex-direction: row;
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
`;

export const FlexPage = euiStyled(EuiPage)`
  align-self: stretch;
  flex: 1 0 0%;
`;
