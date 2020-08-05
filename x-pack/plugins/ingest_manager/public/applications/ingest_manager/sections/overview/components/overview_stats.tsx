/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiDescriptionList } from '@elastic/eui';

export const OverviewStats = styled(EuiDescriptionList).attrs((props) => ({
  compressed: true,
  textStyle: 'reverse',
  type: 'column',
}))`
  & > * {
    margin-top: ${(props) => props.theme.eui.paddingSizes.s} !important;

    &:first-child,
    &:nth-child(2) {
      margin-top: 0 !important;
    }
  }
`;
