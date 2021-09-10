/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, CSSProperties } from 'react';

import type { CommitFn } from '../../../lib/aeroelastic';
import type { CanvasElement, PositionedElement, CanvasAnnotation } from '../../../../types';
import { useInteractionHandlers } from './use_interaction_handlers';

// @ts-expect-error untyped local
import { ElementWrapper } from '../../element_wrapper';
import { Annotation } from '../../layout_annotations';
import { WorkpadShortcuts, Props as ShortcutProps } from '../../workpad_shortcuts';
import { InteractionBoundary } from './interaction_boundary';

export interface Props extends ShortcutProps {
  pageId: string;
  pageStyle: CSSProperties;
  commit: CommitFn;
  canDragElement: (target: EventTarget | null) => boolean;
  className: string;
  elements: Array<CanvasElement | CanvasAnnotation>;
  height: number;
  width: number;
  selectedNodes: PositionedElement[];
  selectToplevelNodes: (nodes: CanvasElement[]) => void;
  insertNodes: (selectedNodes: CanvasElement[], pageId: string) => void;
  removeNodes: (nodeIds: string[], pageId: string) => void;
  cursor: string;
  zoomScale: number;
  elementLayer: (pageId: string, elementId: string, movement: number) => void;
  setMultiplePositions: (elements: PositionedElement[]) => void;
}

export const InteractiveWorkpadPage = ({ commit, zoomScale, canDragElement, ...props }: Props) => {
  const page = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const boundary = useRef<HTMLDivElement>(null);
  const handlers = useInteractionHandlers(page, stage, boundary, {
    commit,
    zoomScale,
    canDragElement,
  });

  const { pageId, pageStyle, className, elements, cursor = 'auto', height, width } = props;

  return (
    <div
      key={pageId}
      id={pageId}
      ref={page}
      data-test-subj="canvasWorkpadPage"
      className={`canvasPage kbn-resetFocusState canvasInteractivePage ${className}`}
      data-shared-items-container
      style={{ ...pageStyle, height, width, cursor }}
      {...handlers}
    >
      <InteractionBoundary ref={boundary} />
      <WorkpadShortcuts {...{ commit, ...props }} />
      <div ref={stage}>
        {elements
          .map((node) => {
            switch (node.type) {
              case 'annotation':
                return <Annotation key={node.id} {...{ zoomScale, node }} />;
              case 'element':
              case 'rectangleElement':
                return <ElementWrapper key={node.id} element={node} />;
              default:
                return null;
            }
          })
          .filter((element) => !!element)}
      </div>
    </div>
  );
};
