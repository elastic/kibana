/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useRef } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
// @ts-expect-error
import { ElementWrapper } from '../../element_wrapper';
import {
  AlignmentGuide,
  DragBoxAnnotation,
  HoverAnnotation,
  TooltipAnnotation,
  RotationHandle,
  BorderConnection,
  BorderResizeHandle,
} from '../../layout_annotations';
import { WorkpadShortcuts } from '../../workpad_shortcuts';
import { InteractionBoundary } from './interaction_boundary';
import { EventHandlers } from './event_handlers';
import { CanvasPage, CanvasNode } from '../../../../types';

export interface InteractiveWorkpadPageProps extends EventHandlers {
  pageId: string;
  pageStyle?: CanvasPage['style'];
  className?: string;
  elements: any[];
  cursor?: string;
  height: number;
  width: number;
  onAnimationEnd?: () => void;
  selectedNodes: CanvasNode[];
  selectToplevelNodes: (nodes: CanvasNode[]) => void;
  insertNodes: (nodes: CanvasNode[], pageId: string) => void;
  removeNodes: (nodeIds: string[], pageId: string) => void;
  elementLayer: (pageId: string, elementId: string, movement: number) => void;
  canvasOrigin: undefined | (() => DOMRect);
  saveCanvasOrigin: React.Dispatch<React.SetStateAction<(() => DOMRect) | undefined>>;
  commit: (type: string, payload: any) => void;
  setMultiplePositions: (nodes: CanvasNode[]) => void;
  zoomScale: number;
}

export const InteractiveWorkpadPage: FC<InteractiveWorkpadPageProps> = ({
  pageId,
  pageStyle,
  className,
  elements,
  cursor = 'auto',
  height,
  width,
  onMouseDown,
  onMouseLeave,
  onMouseMove,
  onAnimationEnd,
  onWheel,
  selectedNodes,
  selectToplevelNodes,
  insertNodes,
  removeNodes,
  elementLayer,
  canvasOrigin,
  saveCanvasOrigin,
  commit,
  setMultiplePositions,
  zoomScale,
  resetHandler,
}) => {
  useEffectOnce(() => resetHandler);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasOrigin && containerRef.current) {
      const node = containerRef.current;
      saveCanvasOrigin(() => () => node.getBoundingClientRect());
    }
  }, [canvasOrigin, saveCanvasOrigin]);

  const shortcutProps = {
    elementLayer,
    insertNodes,
    pageId,
    removeNodes,
    selectedNodes,
    selectToplevelNodes,
    commit,
    setMultiplePositions,
  };

  return (
    <div
      key={pageId}
      id={pageId}
      ref={containerRef}
      data-test-subj="canvasWorkpadPage"
      className={`canvasPage kbn-resetFocusState canvasInteractivePage ${className}`}
      data-shared-items-container
      style={{ ...pageStyle, height, width, cursor }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onAnimationEnd={onAnimationEnd}
      onWheel={onWheel}
    >
      <InteractionBoundary />
      <WorkpadShortcuts {...shortcutProps} />
      {elements
        .map((node) => {
          if (node.type === 'annotation') {
            const props = {
              key: node.id,
              type: node.type,
              transformMatrix: node.transformMatrix,
              width: node.width,
              height: node.height,
              text: node.text,
              zoomScale,
            };

            switch (node.subtype) {
              case 'alignmentGuide':
                return <AlignmentGuide {...props} />;
              case 'adHocChildAnnotation': // now sharing aesthetics but may diverge in the future
              case 'hoverAnnotation': // fixme: with the upcoming TS work, use enumerative types here
                return <HoverAnnotation {...props} />;
              case 'dragBoxAnnotation':
                return <DragBoxAnnotation {...props} />;
              case 'rotationHandle':
                return <RotationHandle {...props} />;
              case 'resizeHandle':
                return <BorderResizeHandle {...props} />;
              case 'resizeConnector':
                return <BorderConnection {...props} />;
              case 'rotationTooltip':
                return <TooltipAnnotation {...props} />;
              default:
                return [];
            }
          } else if (node.type !== 'group') {
            return <ElementWrapper key={node.id} element={node} />;
          }
        })
        .filter((element) => !!element)}
    </div>
  );
};
