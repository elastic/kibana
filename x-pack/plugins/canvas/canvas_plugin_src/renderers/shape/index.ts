/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RendererStrings } from '../../../i18n';
import { shapes } from './shapes';
import { RendererFactory } from '../../../types';
import { Output } from '../../functions/common/shape';

const { shape: strings } = RendererStrings;

export const shape: RendererFactory<Output> = () => ({
  name: 'shape',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { shape: shapeType, fill, border, borderWidth, maintainAspect } = config;

    const parser = new DOMParser();
    const shapeSvg = parser
      .parseFromString(shapes[shapeType], 'image/svg+xml')
      .getElementsByTagName('svg')
      .item(0)!;

    const shapeContent = shapeSvg.firstElementChild!;

    if (fill) {
      shapeContent.setAttribute('fill', fill);
    }
    if (border) {
      shapeContent.setAttribute('stroke', border);
    }
    const strokeWidth = Math.max(borderWidth, 0);
    shapeContent.setAttribute('stroke-width', String(strokeWidth));
    shapeContent.setAttribute('stroke-miterlimit', '999');
    shapeContent.setAttribute('vector-effect', 'non-scaling-stroke');

    shapeSvg.setAttribute('preserveAspectRatio', maintainAspect ? 'xMidYMid meet' : 'none');
    shapeSvg.setAttribute('overflow', 'visible');

    const initialViewBox = shapeSvg
      .getAttribute('viewBox')!
      .split(' ')
      .map((v) => parseInt(v, 10));

    const draw = () => {
      const width = domNode.offsetWidth;
      const height = domNode.offsetHeight;

      // adjust viewBox based on border width
      let [minX, minY, shapeWidth, shapeHeight] = initialViewBox;
      const borderOffset = strokeWidth;

      if (width) {
        const xOffset = (shapeWidth / width) * borderOffset;
        minX -= xOffset;
        shapeWidth += xOffset * 2;
      } else {
        shapeWidth = 0;
      }

      if (height) {
        const yOffset = (shapeHeight / height) * borderOffset;
        minY -= yOffset;
        shapeHeight += yOffset * 2;
      } else {
        shapeHeight = 0;
      }

      shapeSvg.setAttribute('width', String(width));
      shapeSvg.setAttribute('height', String(height));
      shapeSvg.setAttribute('viewBox', [minX, minY, shapeWidth, shapeHeight].join(' '));

      const oldShape = domNode.firstElementChild;
      if (oldShape) {
        domNode.removeChild(oldShape);
      }

      domNode.style.lineHeight = '0';
      domNode.appendChild(shapeSvg);
    };

    draw();
    handlers.done();
    handlers.onResize(draw); // debouncing avoided for fluidity
  },
});
