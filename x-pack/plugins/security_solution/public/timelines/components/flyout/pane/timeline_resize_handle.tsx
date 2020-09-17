/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

export const TIMELINE_RESIZE_HANDLE_WIDTH = 4; // px

export const TimelineResizeHandle = styled.div`
  background-color: ${({ theme }) => theme.eui.euiColorLightShade};
  cursor: col-resize;
  min-height: 20px;
  width: ${TIMELINE_RESIZE_HANDLE_WIDTH}px;
  z-index: 2;
  height: 100vh;
  position: absolute;
  &:hover {
    background-color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;
