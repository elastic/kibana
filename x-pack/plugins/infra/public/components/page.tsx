/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage } from '@elastic/eui';

import { euiStyled } from '../../../observability/public';

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
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

export const FlexPage = euiStyled(EuiPage)`
  flex: 1 0 0%;
`;
