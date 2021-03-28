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
        { place: 'left', index: 0, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 1, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 2, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 3, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 4, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 5, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 6, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 7, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 8, color: 'rgb(84, 179, 153)' },
        { place: 'left', index: 9, color: 'rgb(84, 179, 153)' },
        { place: 'right', index: 0, color: 'rgb(96, 146, 192)' },
        { place: 'right', index: 2, color: 'rgb(96, 146, 192)' },
      ];

      const leftCount = ports.reduce((p, { place }) => (place === 'left' ? p + 1 : p), 0);
      // const rightCount = ports.reduce((p, { place }) => (place === 'right' ? p + 1 : p), 0);

      const tWidthDesired = 16;
      const tHeightDesired = 16;
      const paddingDesired = 4;

      // const tHorizPitchDesired = tWidthDesired + paddingDesired;
      const tVertPitchDesired = tHeightDesired + paddingDesired;

      // const tHorizPitch = Math.min(tHorizPitchDesired, height / leftCount)
      const tVertPitch = Math.min(tVertPitchDesired, height / leftCount);

      const tWidth = tWidthDesired;
      const tHeight = tHeightDesired * (tVertPitch / tVertPitchDesired);
      const vertPadding = paddingDesired * (tVertPitch / tVertPitchDesired);

      ReactDOM.render(
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ strokeWidth: borderWidth, stroke: border }}
        >
          <rect x={0} y={0} width={width} height={height} style={{ fill }} />
          {ports.map(({ place, index, color }, i) => (
            <rect
              key={i}
              x={place === 'left' ? 0 : width - tWidth}
              y={vertPadding / 2 + index * (tHeight + vertPadding)}
              width={tWidth}
              height={tHeight}
              style={{ fill: color }}
            />
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
