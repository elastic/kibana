/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiPanel } from '@elastic/eui';

export const OverviewPanel = styled(EuiPanel).attrs((props) => ({
  paddingSize: 'm',
}))`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
    margin: -${(props) => props.theme.eui.paddingSizes.m} -${(props) =>
        props.theme.eui.paddingSizes.m}
      ${(props) => props.theme.eui.paddingSizes.m};
    padding: ${(props) => props.theme.eui.paddingSizes.s}
      ${(props) => props.theme.eui.paddingSizes.m};
  }

  h2 {
    padding: ${(props) => props.theme.eui.paddingSizes.xs} 0;
  }
`;
