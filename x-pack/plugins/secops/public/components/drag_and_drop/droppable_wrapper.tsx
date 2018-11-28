/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';

interface Props {
  droppableId: string;
}

const ReactDndDropTarget = styled.div<{ isDraggingOver: boolean }>`
  transition: background-color 0.7s ease;
  background-color: ${props =>
    props.isDraggingOver ? '#D9D9D9' : props.theme.eui.euiColorEmptyShade};
  min-height: 100px;
`;

export const DroppableWrapper = pure<Props>(({ droppableId, children }) => (
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
));
