/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ThemeProvider } from 'styled-components';

import * as euiVars from '@elastic/eui/dist/eui_theme_k6_light.json';

interface Props {
  droppableId: string;
}

const ReactDndDropTarget = styled.div<{ isDraggingOver: boolean }>`
  transition: background-color 0.7s ease;
  background-color: ${props =>
    props.isDraggingOver ? '#d9d9d9' : props.theme.eui.euiColorEmptyShade};
  min-height: 100px;
`;

export const DroppableWrapper = pure<Props>(({ droppableId, children }) => (
  <ThemeProvider theme={{ eui: euiVars }}>
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <ReactDndDropTarget
          innerRef={provided.innerRef}
          {...provided.droppableProps}
          isDraggingOver={snapshot.isDraggingOver}
        >
          {children}
        </ReactDndDropTarget>
      )}
    </Droppable>
  </ThemeProvider>
));
