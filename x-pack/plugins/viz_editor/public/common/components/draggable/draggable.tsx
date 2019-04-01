/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A basic drag / drop helper. Modifies a global "value" to track what value is being dragged
 * around.
 *
 * TODO: Replace this with something more robust...
 */

import React, { useState } from 'react';

interface Props {
  value?: any;
  className?: string;
  activeTargetClassName?: string;
  draggable?: boolean;
  canHandleDrop?: (value: any) => boolean;
  onDrop?: (value: any) => void;
  children: any;
}

// HACK: Track what value is being dragged... ultimately, this'll be
// managed by EUI, so maybe a mutable global is OK for now? :/
let draggingValue: any;

const initialState = { isActive: false };

/**
 * A HOC which enables dragging, dropping or both.
 *
 * @param props
 */
export function Draggable(props: Props) {
  const {
    draggable,
    className = '',
    activeTargetClassName = 'draggable-is-active',
    children,
    canHandleDrop = () => false,
    onDrop,
  } = props;
  const [state, setState] = useState(initialState);
  const { isActive } = state;
  const clearState = () => setState(initialState);

  // DOM props for handling drag
  const draggableProps = draggable
    ? {
        draggable: true,
        onDragStart(e: any) {
          e.dataTransfer.setData('text', 'dragging');
          draggingValue = props.value;
        },
      }
    : {};

  // DOM props for handling drop
  const droppableProps = onDrop
    ? {
        onDragLeave: clearState,
        onDragOver(e: any) {
          if (canHandleDrop(draggingValue)) {
            e.preventDefault();
            e.stopPropagation();
            setState({ isActive: true });
          }
        },
        onDrop(e: any) {
          if (canHandleDrop(draggingValue)) {
            e.preventDefault();
            e.stopPropagation();
            onDrop(draggingValue);
            clearState();
          }
        },
      }
    : {};

  return (
    <div
      className={`${className} ${isActive ? activeTargetClassName : ''}`}
      {...droppableProps}
      {...draggableProps}
    >
      {children}
    </div>
  );
}
