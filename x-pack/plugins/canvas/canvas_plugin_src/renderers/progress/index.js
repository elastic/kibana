/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getId } from '../../../public/lib/get_id';
import { RendererStrings } from '../../../i18n';
import { shapes } from './shapes';

const { progress: strings } = RendererStrings;

export const progress = () => ({
  name: 'progress',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { shape, value, max, valueColor, barColor, valueWeight, barWeight, label, font } = config;
    const percent = value / max;
    const shapeDef = shapes[shape];
    const offset = Math.max(valueWeight, barWeight);

    if (shapeDef) {
      const parser = new DOMParser();
      const [shapeSvg] = parser
        .parseFromString(shapes[shape], 'image/svg+xml')
        .getElementsByTagName('svg');

      const initialViewBox = shapeSvg
        .getAttribute('viewBox')
        .split(' ')
        .map(v => parseInt(v, 10));
      let [minX, minY, width, height] = initialViewBox;

      if (shape !== 'horizontalBar') {
        minX -= offset / 2;
        width += offset;
      }

      if (shape === 'semicircle') {
        minY -= offset / 2;
        height += offset / 2;
      } else if (shape !== 'verticalBar') {
        minY -= offset / 2;
        height += offset;
      }

      shapeSvg.setAttribute('className', 'canvasProgress');

      const svgId = getId('svg');
      shapeSvg.id = svgId;

      const [bar] = shapeSvg.getElementsByTagName('path');
      bar.setAttribute('className', 'canvasProgress__background');
      bar.setAttribute('fill', 'none');
      bar.setAttribute('stroke', barColor);
      bar.setAttribute('stroke-width', `${barWeight}px`);

      const value = bar.cloneNode(true);
      value.setAttribute('className', 'canvasProgress__value');
      value.setAttribute('stroke', valueColor);
      value.setAttribute('stroke-width', `${valueWeight}px`);

      const length = value.getTotalLength();
      const to = length * (1 - percent);
      value.setAttribute('stroke-dasharray', length);
      value.setAttribute('stroke-dashoffset', Math.max(0, to));

      shapeSvg.appendChild(value);

      const [text] = shapeSvg.getElementsByTagName('text');

      if (label && text) {
        text.textContent = label;
        text.setAttribute('className', 'canvasProgress__label');

        if (shape === 'horizontalPill') {
          text.setAttribute('x', parseInt(text.getAttribute('x'), 10) + offset / 2);
        }
        if (shape === 'verticalPill') {
          text.setAttribute('y', parseInt(text.getAttribute('y'), 10) - offset / 2);
        }

        Object.assign(text.style, font.spec);
        shapeSvg.appendChild(text);
        domNode.appendChild(shapeSvg);

        const { width: labelWidth, height: labelHeight } = text.getBBox();

        if (shape === 'horizontalBar' || shape === 'horizontalPill') {
          text.setAttribute('x', parseInt(text.getAttribute('x'), 10));
          width += labelWidth;
        }
        if (shape === 'verticalBar' || shape === 'verticalPill') {
          if (labelWidth > width) {
            minX = -labelWidth / 2;
            width = labelWidth;
          }
          minY -= labelHeight;
          height += labelHeight;
        }
      }

      shapeSvg.setAttribute('viewBox', [minX, minY, width, height].join(' '));
      shapeSvg.setAttribute('width', domNode.offsetWidth);
      shapeSvg.setAttribute('height', domNode.offsetHeight);

      if (domNode.firstChild) {
        domNode.removeChild(domNode.firstChild);
      }
      domNode.appendChild(shapeSvg);

      handlers.onResize(() => {
        shapeSvg.setAttribute('width', domNode.offsetWidth);
        shapeSvg.setAttribute('height', domNode.offsetHeight);
      });
    }

    handlers.done();
  },
});
