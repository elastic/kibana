/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';
import { Output } from '../../functions/common/shape';

const { flow: strings } = RendererStrings;

export const flow: RendererFactory<Output> = () => ({
  name: 'flow',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { /* shape: shapeType, */ fill, border, borderWidth } = config;

    const draw = () => {
      const width = domNode.offsetWidth;
      const height = domNode.offsetHeight;

      const ports = [
        { place: 'left', index: 0, title: 'left 0', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 1, title: 'left 1', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 2, title: 'left 2', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 3, title: 'left 3', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 4, title: 'left 4', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 5, title: 'left 5', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 6, title: 'left 6', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 7, title: 'left 7', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 8, title: 'left 8', color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 9, title: 'left 9', color: 'rgb(84, 179, 153)' },
        { place: 'right', index: 0, title: 'right 0', color: 'rgb(96, 146, 192)' },
        { place: 'right', index: 1, title: 'right 1', color: 'rgb(96, 146, 192)' },
      ];

      const leftCount = ports.reduce((p, { place }) => (place === 'left' ? p + 1 : p), 0);
      const rightCount = ports.reduce((p, { place }) => (place === 'right' ? p + 1 : p), 0);

      const tWidthDesired = 16;
      const tHeightDesired = 16;
      const paddingDesired = 4;

      const tVertPitchDesired = tHeightDesired + paddingDesired;

      const tVertPitchLeft = Math.min(tVertPitchDesired, height / leftCount);
      const tVertPitchRight = Math.min(tVertPitchDesired, height / rightCount);

      const tWidth = tWidthDesired;
      const tHeightLeft = tHeightDesired * (tVertPitchLeft / tVertPitchDesired);
      const tHeightRight = tHeightDesired * (tVertPitchRight / tVertPitchDesired);
      const vertPaddingLeft = paddingDesired * (tVertPitchLeft / tVertPitchDesired);
      const vertPaddingRight = paddingDesired * (tVertPitchRight / tVertPitchDesired);

      const remainingPlaceLeft = Math.max(0, height - leftCount * tVertPitchLeft);
      const remainingPlaceRight = Math.max(0, height - rightCount * tVertPitchRight);

      ReactDOM.render(
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ strokeWidth: borderWidth, stroke: border }}
        >
          <rect x={0} y={0} width={width} height={height} style={{ fill }}>
            <title>Flow node</title>
          </rect>
          {ports.map(({ place, index, title, color }, i) => (
            <rect
              key={i}
              x={place === 'left' ? 0 : width - tWidth}
              y={
                place === 'left'
                  ? vertPaddingLeft / 2 +
                    index * (tHeightLeft + vertPaddingLeft) +
                    remainingPlaceLeft / 2
                  : vertPaddingRight / 2 +
                    index * (tHeightRight + vertPaddingRight) +
                    remainingPlaceRight / 2
              }
              width={tWidth}
              height={place === 'left' ? tHeightLeft : tHeightRight}
              style={{ fill: color }}
            >
              <title>{title}</title>
            </rect>
          ))}
        </svg>,
        domNode
      );
    };

    draw();
    handlers.done();
    handlers.onResize(draw); // debouncing avoided for fluidity
  },
});
