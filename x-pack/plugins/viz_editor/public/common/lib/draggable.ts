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

type DropHandler = (value: any, e: any) => void;

interface DroppableOpts {
  canHandleDrop?: (value: any) => boolean;
  dragover?: DropHandler;
  dragleave?: DropHandler;
  drop?: DropHandler;
}

interface DraggableOpts {
  value: any;
}

function dragDroppable() {
  let value: any;

  return {
    droppable(opts: DroppableOpts) {
      const handlerFn = (eventName: string) => (e: any) => {
        if (opts.canHandleDrop && opts.canHandleDrop(value)) {
          e.preventDefault();
          e.stopPropagation();
          const handler = (opts as any)[eventName];
          if (handler) {
            handler(value, e);
          }
        }
      };

      return {
        onDragOver: handlerFn('dragover'),
        onDragLeave: handlerFn('dragleave'),
        onDrop: handlerFn('drop'),
      };
    },

    draggable(opts: DraggableOpts) {
      return {
        draggable: true,
        onDragStart(e: any) {
          e.dataTransfer.setData('text', 'dragging');
          value = opts.value;
        },
      };
    },
  };
}

export const { droppable, draggable } = dragDroppable();
