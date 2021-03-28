/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { euiPaletteColorBlind } from '@elastic/eui';
import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';
import { Output } from '../../functions/common/flow';

const euiVisPalette = euiPaletteColorBlind();
const goldenRatio = 1.618;

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
        { place: 'left', index: 0, title: 'left 0', color: euiVisPalette[0] },
        { place: 'left', index: 1, title: 'left 1', color: euiVisPalette[1] },
        { place: 'left', index: 2, title: 'left 2', color: euiVisPalette[2] },
        { place: 'left', index: 3, title: 'left 3', color: euiVisPalette[3] },
        { place: 'left', index: 4, title: 'left 4', color: euiVisPalette[4] },
        { place: 'left', index: 5, title: 'left 5', color: euiVisPalette[5] },
        { place: 'left', index: 6, title: 'left 6', color: euiVisPalette[6] },
        { place: 'left', index: 7, title: 'left 7', color: euiVisPalette[7] },
        { place: 'left', index: 8, title: 'left 8', color: euiVisPalette[8] },
        { place: 'left', index: 9, title: 'left 9', color: euiVisPalette[9] },
        { place: 'right', index: 0, title: 'right 0', color: euiVisPalette[0] },
        { place: 'right', index: 1, title: 'right 1', color: euiVisPalette[1] },
      ];

      const leftCount = ports.reduce((p, { place }) => (place === 'left' ? p + 1 : p), 0);
      const rightCount = ports.reduce((p, { place }) => (place === 'right' ? p + 1 : p), 0);

      const tSizeDesired = 10;
      const paddingDesired = tSizeDesired / goldenRatio;

      const tVertPitchDesired = tSizeDesired + paddingDesired;

      const tVertPitchLeft = Math.min(tVertPitchDesired, height / leftCount);
      const tVertPitchRight = Math.min(tVertPitchDesired, height / rightCount);

      const tWidth = tSizeDesired;
      const tHeightLeft = tSizeDesired * (tVertPitchLeft / tVertPitchDesired);
      const tHeightRight = tSizeDesired * (tVertPitchRight / tVertPitchDesired);
      const vertPaddingLeft = paddingDesired * (tVertPitchLeft / tVertPitchDesired);
      const vertPaddingRight = paddingDesired * (tVertPitchRight / tVertPitchDesired);

      const remainingPlaceLeft = Math.max(0, height - leftCount * tVertPitchLeft);
      const remainingPlaceRight = Math.max(0, height - rightCount * tVertPitchRight);

      ReactDOM.render(
        <svg viewBox={`0 0 ${width} ${height}`} style={{}}>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            style={{ fill, strokeWidth: borderWidth, stroke: border }}
          >
            <title>Flow node</title>
          </rect>
          {ports.map(({ place, index, title, color }, i) => {
            const x0 = place === 'left' ? 0 : width - tWidth;
            const y0 =
              place === 'left'
                ? vertPaddingLeft / 2 +
                  index * (tHeightLeft + vertPaddingLeft) +
                  remainingPlaceLeft / 2
                : vertPaddingRight / 2 +
                  index * (tHeightRight + vertPaddingRight) +
                  remainingPlaceRight / 2;
            const portWidth = tWidth;
            const portHeight = place === 'left' ? tHeightLeft : tHeightRight;
            return (
              <rect
                key={i}
                x={x0}
                y={y0}
                width={portWidth}
                height={portHeight}
                style={{ fill: color }}
              >
                <title>{title}</title>
              </rect>
            );
          })}
        </svg>,
        domNode
      );
    };

    draw();
    handlers.done();
    handlers.onResize(draw); // debouncing avoided for fluidity
  },
});
