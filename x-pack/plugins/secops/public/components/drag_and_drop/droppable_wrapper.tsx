/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { pure } from 'recompose';
import styled from 'styled-components';
import { Theme } from '../../store/local/app/model';

interface Props {
  droppableId: string;
  isDropDisabled?: boolean;
  theme: Theme;
}

const getBackgroundColor = (theme: Theme): string =>
  theme === 'dark' ? 'rgb(63,63,63)' : '#F5F7FA';

const ReactDndDropTarget = styled.div<{ isDraggingOver: boolean; themeName: Theme }>`
  transition: background-color 0.7s ease;
  background-color: ${({ isDraggingOver, themeName }) =>
    isDraggingOver ? '#f0f8ff' : getBackgroundColor(themeName)};
  min-height: 100px;
`;

export const DroppableWrapper = pure<Props>(
  ({ droppableId, isDropDisabled = false, theme, children }) => (
    <Droppable isDropDisabled={isDropDisabled} droppableId={droppableId} direction={'horizontal'}>
      {(provided, snapshot) => (
        <ReactDndDropTarget
          themeName={theme}
          innerRef={provided.innerRef}
          {...provided.droppableProps}
          isDraggingOver={snapshot.isDraggingOver}
        >
          {children}
          {provided.placeholder}
        </ReactDndDropTarget>
      )}
    </Droppable>
  )
);
