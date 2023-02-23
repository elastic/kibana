/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragContextState } from '../../drag_drop';

export function createMockedDragDropContext(): jest.Mocked<DragContextState> {
  return {
    dragging: undefined,
    setDragging: jest.fn(),
    activeDropTarget: undefined,
    setActiveDropTarget: jest.fn(),
    keyboardMode: false,
    setKeyboardMode: jest.fn(),
    setA11yMessage: jest.fn(),
    dropTargetsByOrder: undefined,
    registerDropTarget: jest.fn(),
  };
}
