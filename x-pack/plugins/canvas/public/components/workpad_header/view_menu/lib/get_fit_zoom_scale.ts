/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR,
  WORKPAD_CANVAS_BUFFER,
} from '../../../../../common/lib';
import { CanvasWorkpadBoundingBox } from '../../../../../types';

export const getFitZoomScale = (
  boundingBox: CanvasWorkpadBoundingBox,
  workpadWidth: number,
  workpadHeight: number
) => {
  const canvasLayoutContent = document.querySelector(
    `#${CANVAS_LAYOUT_STAGE_CONTENT_SELECTOR}`
  ) as HTMLElement;
  const layoutWidth = canvasLayoutContent.clientWidth;
  const layoutHeight = canvasLayoutContent.clientHeight;
  const offsetLeft = boundingBox.left;
  const offsetTop = boundingBox.top;
  const offsetRight = boundingBox.right - workpadWidth;
  const offsetBottom = boundingBox.bottom - workpadHeight;
  const boundingWidth =
    workpadWidth +
    Math.max(Math.abs(offsetLeft), Math.abs(offsetRight)) * 2 +
    WORKPAD_CANVAS_BUFFER;
  const boundingHeight =
    workpadHeight +
    Math.max(Math.abs(offsetTop), Math.abs(offsetBottom)) * 2 +
    WORKPAD_CANVAS_BUFFER;
  const xScale = layoutWidth / boundingWidth;
  const yScale = layoutHeight / boundingHeight;

  return Math.min(xScale, yScale);
};
