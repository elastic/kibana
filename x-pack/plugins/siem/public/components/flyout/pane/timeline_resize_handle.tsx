/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

export const TIMELINE_RESIZE_HANDLE_WIDTH = 2; // px

export const TimelineResizeHandle = styled.div<{ height: number }>`
  cursor: col-resize;
  height: 100%;
  min-height: 20px;
  width: 0;
  border: ${TIMELINE_RESIZE_HANDLE_WIDTH}px solid ${props => props.theme.eui.euiColorLightShade};
  z-index: 2;
  height: ${({ height }) => `${height}px`};
  position: absolute;
`;
