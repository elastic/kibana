/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

export const CELL_RESIZE_HANDLE_WIDTH = 1; // px;
export const TIMELINE_RESIZE_HANDLE_WIDTH = 2; // px

export const CommonResizeHandle = styled.div`
  cursor: col-resize;
  height: 100%;
  min-height: 20px;
  width: 0;
`;

export const CellResizeHandle = styled(CommonResizeHandle)`
  border ${CELL_RESIZE_HANDLE_WIDTH}px solid ${({ theme }) =>
  theme.darkMode ? theme.eui.euiFormBackgroundColor : theme.eui.euiColorLightestShade};
`;

export const ColumnHeaderResizeHandle = styled(CellResizeHandle)`
  border ${CELL_RESIZE_HANDLE_WIDTH}px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;

export const TimelineResizeHandle = styled(CommonResizeHandle)<{ height: number }>`
  border: ${TIMELINE_RESIZE_HANDLE_WIDTH}px solid ${props => props.theme.eui.euiColorLightShade};
  height: ${({ height }) => `${height}px`};
  position: absolute;
`;
