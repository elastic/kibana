/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import React from 'react';

jest.mock('react-beautiful-dnd', () => ({
  Droppable: ({
    children,
  }: {
    children: (a: DroppableProvided, b: DroppableStateSnapshot) => void;
  }) =>
    children(
      {
        droppableProps: {
          'data-rbd-droppable-context-id': '123',
          'data-rbd-droppable-id': '123',
        },
        innerRef: jest.fn(),
      },
      {
        isDraggingOver: false,
        isUsingPlaceholder: false,
      }
    ),
  Draggable: ({
    children,
  }: {
    children: (a: DraggableProvided, b: DraggableStateSnapshot) => void;
  }) =>
    children(
      {
        draggableProps: {
          'data-rbd-draggable-context-id': '123',
          'data-rbd-draggable-id': '123',
        },
        innerRef: jest.fn(),
      },
      {
        isDragging: false,
        isDropAnimating: false,
      }
    ),
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
}));
