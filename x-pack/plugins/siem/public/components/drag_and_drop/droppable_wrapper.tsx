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
      background-color: ${props => props.theme.eui.euiFormBackgroundColor};
    }
  }
  ${props =>
    props.isDraggingOver
      ? `
    .drop-and-provider-timeline {
      &:hover {
        background-color: ${props.theme.eui.euiColorEmptyShade};
      }
    }
  > div.timeline-drop-area-empty {
     background-color: ${props.theme.eui.euiColorLightShade};
  }
  > div.timeline-drop-area {
    background-color: ${props.theme.eui.euiColorLightShade};
    .provider-item-filter-container div:first-child{
      // Override dragNdrop beautiful so we do not have our droppable moving around for no good reason
      transform: none !important;
    }
    .drop-and-provider-timeline {
      display: block !important;
      + div {
        display: none;
      }
    }
  }
  .flyout-overlay {
    .euiPanel {
      background-color: ${props.theme.eui.euiColorLightShade};
    }
    + div {
      // Override dragNdrop beautiful so we do not have our droppable moving around for no good reason
      display: none !important;
    }
  }
  `
      : ''}
  > div.timeline-drop-area {
    .drop-and-provider-timeline {
      display: none;
    }
    & + div {
      // Override dragNdrop beautiful so we do not have our droppable moving around for no good reason
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
