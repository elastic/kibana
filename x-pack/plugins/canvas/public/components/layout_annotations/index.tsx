/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CanvasAnnotation } from '../../../types';
import { AlignmentGuide } from './alignment_guide';
import { DragBoxAnnotation } from './dragbox_annotation';
import { HoverAnnotation } from './hover_annotation';
import { TooltipAnnotation } from './tooltip_annotation';
import { RotationHandle } from './rotation_handle';
import { BorderConnection } from './border_connection';
import { BorderResizeHandle } from './border_resize_handle';

export { AlignmentGuide } from './alignment_guide';
export { DragBoxAnnotation } from './dragbox_annotation';
export { HoverAnnotation } from './hover_annotation';
export { TooltipAnnotation } from './tooltip_annotation';
export { RotationHandle } from './rotation_handle';
export { BorderConnection } from './border_connection';
export { BorderResizeHandle } from './border_resize_handle';

export interface Props {
  node: CanvasAnnotation;
  zoomScale: number;
}

export const Annotation = (props: Props) => {
  const { node, zoomScale } = props;
  switch (props.node.subtype) {
    case 'alignmentGuide':
      return <AlignmentGuide {...{ zoomScale, ...node }} />;
    case 'adHocChildAnnotation': // now sharing aesthetics but may diverge in the future
    case 'hoverAnnotation': // fixme: with the upcoming TS work, use enumerative types here
      return <HoverAnnotation {...{ zoomScale, ...node }} />;
    case 'dragBoxAnnotation':
      return <DragBoxAnnotation {...{ zoomScale, ...node }} />;
    case 'rotationHandle':
      return <RotationHandle {...{ zoomScale, ...node }} />;
    case 'resizeHandle':
      return <BorderResizeHandle {...{ zoomScale, ...node }} />;
    case 'resizeConnector':
      return <BorderConnection {...{ zoomScale, ...node }} />;
    case 'rotationTooltip':
      return <TooltipAnnotation {...{ zoomScale, ...node }} />;
    default:
      return null;
  }
};
