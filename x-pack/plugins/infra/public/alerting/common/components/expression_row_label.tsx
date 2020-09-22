/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { euiStyled } from '../../../../../observability/public';

export const ExpressionRowLabel = euiStyled(EuiFlexItem).attrs({ grow: false })`
flex-direction: row;
align-items: center;
margin-right: 8px !important;
padding: 6px;
background-color: ${(props) => props.theme.eui.euiColorLightestShade};
border-radius: 4px;
color: ${(props) => props.theme.eui.euiTitleColor};
font-weight: 600;
`;
