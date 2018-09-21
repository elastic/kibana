/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getId } from '../../../public/lib/get_id';
import { shapes } from './shapes';

export const progress = () => ({
  name: 'progress',
  displayName: 'Progress',
  help: 'Reveal a percentage of an element',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { shape, value, max, valueColor, barColor, weight, label, labelPosition, font } = config;
    const percent = value / max;
    const shapeDef = shapes[shape];

    if (shapeDef) {
      const parser = new DOMParser();
      const [shapeSvg] = parser
        .parseFromString(shapes[shape], 'image/svg+xml')
        .getElementsByTagName('svg');

      const initialViewBox = shapeSvg
        .getAttribute('viewBox')
        .split(' ')
        .map(v => parseInt(v, 10));
      let [minX, minY] = initialViewBox;
      const [, , width, height] = initialViewBox;
      if (shape !== 'horizontalBar') minX -= weight / 2;
      if (shape !== 'verticalBar') minY -= weight / 2;
      let offsetWidth = width + weight;
      let offsetHeight = height + weight;

      shapeSvg.setAttribute('className', 'canvasProgress');
      shapeSvg.setAttribute('width', domNode.offsetWidth);
      shapeSvg.setAttribute('height', domNode.offsetHeight);

      const svgId = getId('svg');
      shapeSvg.id = svgId;

      const [bar] = shapeSvg.getElementsByTagName('path');
      bar.setAttribute('className', 'canvasProgress__background');
      bar.setAttribute('fill', 'none');
      bar.setAttribute('stroke', barColor);
      bar.setAttribute('stroke-width', `${weight}px`);

      const value = bar.cloneNode(true);
      value.setAttribute('className', 'canvasProgress__value');
      value.setAttribute('stroke', valueColor);

      const length = value.getTotalLength();
      const to = length * (1 - percent);
      value.setAttribute('stroke-dasharray', length);
      value.setAttribute('stroke-dashoffset', Math.max(0, to));

      shapeSvg.appendChild(value);

      if (label) {
        const labelText = document.createTextNode(label);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('className', 'canvasProgress__label');
        Object.assign(text.style, font.spec);

        text.appendChild(labelText);
        shapeSvg.appendChild(text);

        domNode.appendChild(shapeSvg);

        const { width: labelWidth, height: labelHeight } = document
          .getElementById(svgId)
          .lastChild.getBBox();

        let labelX;
        let labelY;
        let textAnchor;
        let dominantBaseline;

        switch (labelPosition) {
          case 'center':
            textAnchor = 'middle';
            dominantBaseline = 'central';
            labelX = width / 2;
            labelY = height / 2;

            if (labelWidth > offsetWidth) {
              minX = -labelWidth / 2;
              offsetWidth = labelWidth;
            }
            break;
          case 'above':
            textAnchor = 'middle';
            dominantBaseline = 'text-after-edge';
            labelX = width / 2;
            labelY = shape === 'verticalBar' ? 0 : -weight / 2;
            minY -= labelHeight;
            offsetHeight += labelHeight;

            if (labelWidth > offsetWidth) {
              minX = -labelWidth / 2;
              offsetWidth = labelWidth;
            }
            break;
          case 'below':
            textAnchor = 'middle';
            dominantBaseline = 'text-before-edge';
            labelX = width / 2;
            labelY = shape === 'verticalBar' ? height : height + weight / 2;
            offsetHeight += labelHeight;

            if (labelWidth > offsetWidth) {
              minX = -labelWidth / 2;
              offsetWidth = labelWidth;
            }
            break;
          case 'left':
            textAnchor = 'end';
            dominantBaseline = 'central';
            labelX = shape === 'horizontalBar' ? 0 : -weight / 2;
            labelY = height / 2;
            minX -= labelWidth;
            offsetWidth += labelWidth;

            if (labelHeight > offsetHeight) {
              minY = -labelHeight / 2;
              offsetHeight = labelHeight;
            }
            break;
          case 'right':
            textAnchor = 'start';
            dominantBaseline = 'central';
            labelX = shape === 'horizontalBar' ? width : width + weight / 2;
            labelY = labelY = height / 2;
            offsetWidth += labelWidth;

            if (labelHeight > offsetHeight) {
              minY = -labelHeight / 2;
              offsetHeight = labelHeight;
            }
            break;
        }

        text.setAttribute('text-anchor', textAnchor);
        text.setAttribute('dominant-baseline', dominantBaseline);
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
      }

      shapeSvg.setAttribute('viewBox', [minX, minY, offsetWidth, offsetHeight].join(' '));

      if (domNode.firstChild) domNode.removeChild(domNode.firstChild);
      domNode.appendChild(shapeSvg);

      handlers.onResize(() => {
        shapeSvg.setAttribute('width', domNode.offsetWidth);
        shapeSvg.setAttribute('height', domNode.offsetHeight);
      });
    }

    handlers.done();
  },
});
