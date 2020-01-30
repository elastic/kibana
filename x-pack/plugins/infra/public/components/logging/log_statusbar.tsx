/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { euiStyled } from '../../../../observability/public';

export const LogStatusbar = euiStyled(EuiFlexGroup).attrs(() => ({
  alignItems: 'center',
  gutterSize: 'none',
  justifyContent: 'flexEnd',
}))`
  padding: ${props => props.theme.eui.euiSizeS};
  border-top: ${props => props.theme.eui.euiBorderThin};
  max-height: 48px;
  min-height: 48px;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  flex-direction: row;
`;

export const LogStatusbarItem = EuiFlexItem;
