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
  width: 100%;
  height: 100%;
  .flyout-overlay {
    .euiPanel {
      background-color: ${({ themeName }) => getBackgroundColor(themeName)};
    }
  }
  ${({ isDraggingOver }) =>
    isDraggingOver
      ? `
    .drop-and-provider-timeline {
      &:hover {
        background: repeating-linear-gradient(
          -55deg,
          rgb(52, 55, 65),
          rgb(52, 55, 65) 10px,
          rgb(245, 247, 250) 10px,
          rgb(245, 247, 250) 20px
        );
      }
    }
  > div.timeline-drop-area {
    background-color: rgb(245, 247, 250);
    .provider-item-filter-container div:first-child{
      /// Ooverwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      transform: none !important;
    }
  }
  .flyout-overlay {
    .euiPanel {
      background-color: rgb(245, 247, 250);
    }
    + div {
      // Ooverwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      display: none !important;
    }
  }
  
  `
      : ''}
  > div.timeline-drop-area {
    & + div {
      // overwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      display: none !important;
    }
  }
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
