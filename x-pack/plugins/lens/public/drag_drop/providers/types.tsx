/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DropType } from '../../types';

export interface HumanData {
  label: string;
  groupLabel?: string;
  position?: number;
  nextLabel?: string;
  canSwap?: boolean;
  canDuplicate?: boolean;
  canCombine?: boolean;
}

export interface Ghost {
  children: React.ReactElement;
  style: React.CSSProperties;
}

export type DragDropIdentifier = Record<string, unknown> & {
  id: string;
  /**
   * The data for accessibility, consists of required label and not required groupLabel and position in group
   */
  humanData: HumanData;
};

export type DraggingIdentifier = DragDropIdentifier & {
  ghost?: Ghost;
};

export type DropIdentifier = DragDropIdentifier & {
  dropType: DropType;
  onDrop: DropHandler;
};

/**
 * A function that handles a drop event.
 */
export type DropHandler = (dropped: DragDropIdentifier, dropType?: DropType) => void;

export type RegisteredDropTargets = Record<string, DropIdentifier | undefined> | undefined;

/**
 * The shape of the drag / drop context.
 */

export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging?: DraggingIdentifier;

  /**
   * keyboard mode
   */
  keyboardMode: boolean;
  /**
   * keyboard mode
   */
  setKeyboardMode: (mode: boolean) => void;
  /**
   * Set the item being dragged.
   */
  setDragging: (dragging?: DraggingIdentifier) => void;

  activeDropTarget?: DropIdentifier;

  dropTargetsByOrder: RegisteredDropTargets;

  setActiveDropTarget: (newTarget?: DropIdentifier) => void;

  setA11yMessage: (message: string) => void;
  registerDropTarget: (order: number[], dropTarget?: DropIdentifier) => void;
}
