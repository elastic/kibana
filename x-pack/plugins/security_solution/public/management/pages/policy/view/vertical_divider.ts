/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

type SpacingOptions = 'xs' | 's' | 'm' | 'l' | 'xl';

/**
 * A vertical divider - show a vertical line that spans 100% of the height of its parent container.
 * Ideal for use (for example) in `EuiFlexItem`
 *
 * @param [spacing] optional horizontal spacing (on each side of the vertical line). Uses the value `EuiSpacer`
 *
 */
export const VerticalDivider = styled.div<{ spacing?: SpacingOptions }>`
  width: 0;
  height: 100%;
  border-left: ${(props) => props.theme.eui.euiBorderThin};
  margin-left: ${(props) => {
    const size = props?.spacing && `euiSize${props.spacing.toUpperCase()}`;
    return size ? props.theme.eui[size] : 0;
  }};
  margin-right: ${(props) => {
    const size = props?.spacing && `euiSize${props.spacing.toUpperCase()}`;
    return size ? props.theme.eui[size] : 0;
  }};
`;
