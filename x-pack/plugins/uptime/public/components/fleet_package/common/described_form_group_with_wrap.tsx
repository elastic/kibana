/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDescribedFormGroup } from '@elastic/eui';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';

/**
 * EuiForm group doesn't expose props to control the flex wrapping on flex groups defining form rows.
 * This override allows to define a minimum column width to which the Described Form's flex rows should wrap.
 */
export const DescribedFormGroupWithWrap = euiStyled(EuiDescribedFormGroup)<{
  minColumnWidth?: string;
}>`
  > .euiFlexGroup {
    ${({ minColumnWidth }) => (minColumnWidth ? `flex-wrap: wrap;` : '')}
    > .euiFlexItem {
      ${({ minColumnWidth }) => (minColumnWidth ? `min-width: ${minColumnWidth};` : '')}
    }
  }
`;
