/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from '@emotion/styled';

export const LogStatusbar = styled(EuiFlexGroup)`
  padding: ${(props) => props.theme.euiTheme.size.s};
  border-top: ${(props) => props.theme.euiTheme.border.thin};
  max-height: 48px;
  min-height: 48px;
  background-color: ${(props) => props.theme.euiTheme.colors.emptyShade};
  flex-direction: row;
`;

LogStatusbar.defaultProps = { alignItems: 'center', gutterSize: 'none', justifyContent: 'flexEnd' };

export const LogStatusbarItem = EuiFlexItem;
