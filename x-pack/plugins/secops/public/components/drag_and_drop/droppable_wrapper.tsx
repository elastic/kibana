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
  isDropDisabled?: boolean;
}

const ReactDndDropTarget = styled.div<{ isDraggingOver: boolean }>`
  transition: background-color 0.7s ease;
  width: 100%;
  height: 100%;
  .flyout-overlay {
    .euiPanel {
      background-color: ${props => props.theme.eui.euiColorLightestShade};
    }
  }
  ${props =>
    props.isDraggingOver
      ? `
    .drop-and-provider-timeline {
      &:hover {
        background: repeating-linear-gradient(
          -55deg,
          ${props.theme.eui.euiColorDarkestShade},
          ${props.theme.eui.euiColorDarkestShade} 10px,
          ${props.theme.eui.euiColorEmptyShade} 10px,
          ${props.theme.eui.euiColorEmptyShade} 20px
        );
      }
    }
  > div.timeline-drop-area {
    background-color: ${props.theme.eui.euiColorMediumShade};
    .provider-item-filter-container div:first-child{
      /// Overwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      transform: none !important;
    }
  }
  .flyout-overlay {
    .euiPanel {
      background-color: ${props.theme.eui.euiColorMediumShade};
    }
    + div {
      // Overwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      display: none !important;
    }
  }
  
  `
      : ''}
  > div.timeline-drop-area {
    & + div {
      // Overwride dragNdrop beautifull so we do not have our droppable moving around for no good reason
      display: none !important;
    }
  }
`;

export const DroppableWrapper = pure<Props>(({ droppableId, isDropDisabled = false, children }) => (
  <Droppable isDropDisabled={isDropDisabled} droppableId={droppableId} direction={'horizontal'}>
    {(provided, snapshot) => (
      <ReactDndDropTarget
        innerRef={provided.innerRef}
        {...provided.droppableProps}
        isDraggingOver={snapshot.isDraggingOver}
      >
        {children}
        {provided.placeholder}
      </ReactDndDropTarget>
    )}
  </Droppable>
));
