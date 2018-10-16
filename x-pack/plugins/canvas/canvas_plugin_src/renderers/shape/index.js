/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shapes } from './shapes';

export const shape = () => ({
  name: 'shape',
  displayName: 'Shape',
  help: 'Render an shape',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { shape, fill, border, borderWidth, maintainAspect } = config;
    const parser = new DOMParser();
    const [shapeSvg] = parser
      .parseFromString(shapes[shape], 'image/svg+xml')
      .getElementsByTagName('svg');

    const shapeContent = shapeSvg.firstElementChild;

    if (fill) shapeContent.setAttribute('fill', fill);
    if (border) shapeContent.setAttribute('stroke', border);
    if (borderWidth >= 0) shapeContent.setAttribute('stroke-width', borderWidth);
    shapeContent.setAttribute('stroke-miterlimit', 999);
    shapeContent.setAttribute('vector-effect', 'non-scaling-stroke');

    shapeSvg.setAttribute('preserveAspectRatio', maintainAspect ? 'xMidYMid meet' : 'none');
    shapeSvg.setAttribute('overflow', 'visible');

    const initialViewBox = shapeSvg
      .getAttribute('viewBox')
      .split(' ')
      .map(v => parseInt(v, 10));

    const draw = () => {
      const width = domNode.offsetWidth;
      const height = domNode.offsetHeight;

      // adjust viewBox based on border width
      let [minX, minY, maxX, maxY] = initialViewBox;

      const xScale = (maxX - minX) / width;
      const yScale = (maxY - minY) / height;
      const borderOffset = borderWidth / 2;
      const xOffset = borderOffset * xScale;
      const yOffset = borderOffset * yScale;

      minX -= xOffset; // min-x
      minY -= yOffset; // min-y
      maxX += xOffset * 2; // width
      maxY += yOffset * 2; // height

      shapeSvg.setAttribute('width', width);
      shapeSvg.setAttribute('height', height);
      shapeSvg.setAttribute('viewBox', [minX, minY, maxX, maxY].join(' '));

      const oldShape = domNode.firstElementChild;
      if (oldShape) domNode.removeChild(oldShape);

      domNode.appendChild(shapeSvg);
    };

    draw();
    handlers.done();
    handlers.onResize(draw); // debouncing avoided for fluidity
  },
});
