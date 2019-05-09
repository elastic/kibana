/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiStyled from '../../../../../../common/eui_styled_components';

export const LogTextStreamItemField = euiStyled.div.attrs<{
  baseWidth?: string;
  growWeight?: number;
  shrinkWeight?: number;
}>({})`
  align-items: stretch;
  display: flex;
  flex-basis: ${props => props.baseWidth || '0%'};
  flex-direction: row;
  flex-grow: ${props => props.growWeight || 0};
  flex-shrink: ${props => props.shrinkWeight || 0};
  overflow: hidden;
`;

export const LogTextStreamItemFieldContent = euiStyled.div`
  flex: 1 0 0%;
  padding: 2px ${props => props.theme.eui.paddingSizes.m};
`;
