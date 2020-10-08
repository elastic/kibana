/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

/** Renders the body (non-pointy part) of an arrow */
export const ArrowBody = styled.span<{ height: number }>`
  background-color: ${(props) => props.theme.eui.euiColorLightShade};
  height: ${({ height }) => `${height}px`};
  width: 25px;
`;

ArrowBody.displayName = 'ArrowBody';

export type ArrowDirection = 'arrowLeft' | 'arrowRight';

/** Renders the head of an arrow */
export const ArrowHead = React.memo<{
  direction: ArrowDirection;
}>(({ direction }) => (
  <EuiIcon color="subdued" data-test-subj="arrow-icon" size="s" type={direction} />
));

ArrowHead.displayName = 'ArrowHead';
